package com.shimatoshi.tidewidget

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.widget.RemoteViews
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone

class TideWidgetProvider : AppWidgetProvider() {

    override fun onUpdate(context: Context, manager: AppWidgetManager, ids: IntArray) {
        val pending = goAsync()
        Thread {
            try {
                for (id in ids) update(context, manager, id)
            } finally {
                pending.finish()
            }
        }.start()
    }

    override fun onDeleted(context: Context, ids: IntArray) {
        val e = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit()
        for (id in ids) e.remove("station_$id")
        e.apply()
    }

    companion object {
        private const val PREFS = "tide_widget"

        fun saveStation(ctx: Context, id: Int, code: String) {
            ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putString("station_$id", code).apply()
        }

        private fun fmtTide(label: String, ev: List<TideEvent>, withCm: Boolean): String =
            label + " " + ev.joinToString("  ") { if (withCm) "${it.time}(${it.cm}cm)" else it.time }

        fun update(ctx: Context, manager: AppWidgetManager, id: Int) {
            val views = RemoteViews(ctx.packageName, R.layout.widget)

            // タップで手動更新
            val refresh = Intent(ctx, TideWidgetProvider::class.java).apply {
                action = AppWidgetManager.ACTION_APPWIDGET_UPDATE
                putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, intArrayOf(id))
            }
            views.setOnClickPendingIntent(
                R.id.root,
                PendingIntent.getBroadcast(ctx, id, refresh, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE),
            )

            val code = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString("station_$id", null)
            val station = code?.let { c -> Api.loadStations(ctx).firstOrNull { it.code == c } }
            if (station == null) {
                views.setTextViewText(R.id.title, "地点が未設定です")
                views.setTextViewText(R.id.wx_detail, "ウィジェットを長押しして設定してください")
                manager.updateAppWidget(id, views)
                return
            }
            views.setTextViewText(R.id.title, station.name)

            var ok = false
            try {
                val w = Api.fetchWeather(station.lat, station.lon)
                val (icon, label) = Api.weatherLabel(w.code)
                views.setTextViewText(R.id.wx_icon, icon)
                views.setTextViewText(R.id.wx_temp, "${Math.round(w.temp)}°")
                views.setTextViewText(R.id.wx_detail, "$label  ${Math.round(w.tmax)}°/${Math.round(w.tmin)}°  降水${w.pop}%")
                ok = true
            } catch (e: Exception) {
                views.setTextViewText(R.id.wx_detail, "天気を取得できませんでした")
            }

            try {
                val days = Api.fetchTide(station.code)
                val age = Api.moonAge()
                views.setTextViewText(R.id.tide_head, "${Api.tideName(age)}（月齢 ${"%.1f".format(age)}）")
                val today = days.getOrNull(0)
                val tomorrow = days.getOrNull(1)
                views.setTextViewText(
                    R.id.tide_today,
                    if (today == null) "潮位データなし" else
                        "今日 " + fmtTide("満", today.high, true) + "\n" + "　　 " + fmtTide("干", today.low, true),
                )
                views.setTextViewText(
                    R.id.tide_tomorrow,
                    if (tomorrow == null) "" else
                        "明日 " + fmtTide("満", tomorrow.high, false) + "  " + fmtTide("干", tomorrow.low, false),
                )
                ok = true
            } catch (e: Exception) {
                views.setTextViewText(R.id.tide_head, "潮位を取得できませんでした")
            }

            val fmt = SimpleDateFormat("HH:mm", Locale.JAPAN).apply { timeZone = TimeZone.getTimeZone("Asia/Tokyo") }
            views.setTextViewText(R.id.updated, (if (ok) "更新 " else "失敗 ") + fmt.format(Date()) + "（タップで更新）")
            manager.updateAppWidget(id, views)
        }
    }
}
