package com.shimatoshi.tidewidget

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.util.Calendar
import java.util.TimeZone

data class Station(val code: String, val name: String, val lat: Double, val lon: Double, val region: String)

data class TideEvent(val time: String, val cm: Int)

data class TideDay(val date: String, val high: List<TideEvent>, val low: List<TideEvent>)

data class Weather(val temp: Double, val code: Int, val tmax: Double, val tmin: Double, val pop: Int)

object Api {
    private val JST: TimeZone = TimeZone.getTimeZone("Asia/Tokyo")

    private fun httpGet(url: String): String {
        val conn = URL(url).openConnection() as HttpURLConnection
        conn.connectTimeout = 10000
        conn.readTimeout = 15000
        conn.setRequestProperty("User-Agent", "TideWidget/1.0")
        try {
            if (conn.responseCode != 200) throw RuntimeException("HTTP ${conn.responseCode}")
            return conn.inputStream.bufferedReader().use { it.readText() }
        } finally {
            conn.disconnect()
        }
    }

    // assets/tide-stations.json（PWAと同じ観測点リスト）
    fun loadStations(ctx: Context): List<Station> {
        val txt = ctx.assets.open("tide-stations.json").bufferedReader().use { it.readText() }
        val arr = JSONArray(txt)
        return (0 until arr.length()).map {
            val o = arr.getJSONObject(it)
            Station(o.getString("code"), o.getString("name"), o.getDouble("lat"), o.getDouble("lon"), o.optString("region"))
        }
    }

    fun fetchWeather(lat: Double, lon: Double): Weather {
        val url = "https://api.open-meteo.com/v1/forecast?latitude=$lat&longitude=$lon" +
            "&current=temperature_2m,weather_code" +
            "&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max" +
            "&timezone=Asia%2FTokyo&forecast_days=1"
        val o = JSONObject(httpGet(url))
        val cur = o.getJSONObject("current")
        val d = o.getJSONObject("daily")
        return Weather(
            cur.getDouble("temperature_2m"),
            cur.getInt("weather_code"),
            d.getJSONArray("temperature_2m_max").getDouble(0),
            d.getJSONArray("temperature_2m_min").getDouble(0),
            d.getJSONArray("precipitation_probability_max").optInt(0),
        )
    }

    private fun sub(s: String, start: Int, len: Int): String {
        if (start >= s.length) return ""
        return s.substring(start, minOf(s.length, start + len))
    }

    // 気象庁 潮位表テキストの1行（=1日）を解析。固定長フォーマット（PWAのparseTideLineと同じ）
    private fun parseTideLine(line: String): TideDay? {
        if (line.length < 108) return null
        val yy = sub(line, 72, 2).trim().toIntOrNull() ?: return null
        val mm = sub(line, 74, 2).trim().toIntOrNull() ?: return null
        val dd = sub(line, 76, 2).trim().toIntOrNull() ?: return null
        fun events(start: Int): List<TideEvent> {
            val ev = mutableListOf<TideEvent>()
            for (k in 0 until 4) {
                val traw = sub(line, start + k * 7, 4)
                val h = sub(line, start + k * 7 + 4, 3).trim().toIntOrNull() ?: continue
                if (h == 999 || traw == "9999") continue
                val t = traw.replace(' ', '0')
                if (t.length < 4) continue
                ev.add(TideEvent("${t.substring(0, 2)}:${t.substring(2, 4)}", h))
            }
            return ev
        }
        val date = "20%02d-%02d-%02d".format(yy, mm, dd)
        return TideDay(date, events(80), events(108))
    }

    private fun dateKey(c: Calendar) =
        "%04d-%02d-%02d".format(c.get(Calendar.YEAR), c.get(Calendar.MONTH) + 1, c.get(Calendar.DAY_OF_MONTH))

    // 今日と明日の潮位（満潮・干潮）。年またぎは翌年ファイルも取得する
    fun fetchTide(code: String): List<TideDay> {
        val today = Calendar.getInstance(JST)
        val tomorrow = (today.clone() as Calendar).apply { add(Calendar.DAY_OF_MONTH, 1) }
        val byDate = HashMap<String, TideDay>()
        for (year in listOf(today.get(Calendar.YEAR), tomorrow.get(Calendar.YEAR)).distinct()) {
            val url = "https://www.data.jma.go.jp/kaiyou/data/db/tide/suisan/txt/$year/$code.txt"
            try {
                for (line in httpGet(url).split('\n')) parseTideLine(line)?.let { byDate[it.date] = it }
            } catch (e: Exception) {
                if (year == today.get(Calendar.YEAR)) throw e
            }
        }
        return listOf(today, tomorrow).mapNotNull { byDate[dateKey(it)] }
    }

    // 月齢（簡易計算）
    fun moonAge(): Double {
        val jd = System.currentTimeMillis() / 86400000.0 + 2440587.5
        val synodic = 29.530588853
        val a = (jd - 2451550.1) % synodic
        return if (a < 0) a + synodic else a
    }

    // 月齢から潮回りの目安
    fun tideName(age: Double): String = when (age.toInt()) {
        0, 1, 2, 14, 15, 16, 28, 29 -> "大潮"
        3, 4, 5, 11, 12, 13, 17, 18, 19, 25, 26, 27 -> "中潮"
        6, 7, 8, 20, 21, 22 -> "小潮"
        9, 23 -> "長潮"
        10, 24 -> "若潮"
        else -> "中潮"
    }

    // WMO天気コード → 絵文字・日本語
    fun weatherLabel(code: Int): Pair<String, String> = when (code) {
        0 -> "☀️" to "快晴"
        1 -> "🌤" to "晴れ"
        2 -> "⛅" to "薄曇り"
        3 -> "☁️" to "曇り"
        45, 48 -> "🌫" to "霧"
        in 51..57 -> "🌦" to "霧雨"
        in 61..67 -> "🌧" to "雨"
        in 71..77 -> "❄️" to "雪"
        in 80..82 -> "🌦" to "にわか雨"
        85, 86 -> "🌨" to "にわか雪"
        in 95..99 -> "⛈" to "雷雨"
        else -> "❔" to "不明"
    }
}
