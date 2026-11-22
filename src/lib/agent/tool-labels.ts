/** Past-tense chips shown under assistant replies, keyed by tool name. */
export const TOOL_ACTIVITY_LABELS: Record<string, string> = {
  get_current_datetime: "Tarih kontrol edildi",
  list_calendar_events: "Takvim okundu",
  find_free_slots: "Boş zamanlar hesaplandı",
  create_calendar_event: "Onaya gönderildi",
  list_tasks: "Görevler okundu",
  create_task: "Görev eklendi",
  complete_task: "Görev tamamlandı",
  update_task: "Görev güncellendi",
  search_emails: "E-postalar arandı",
  read_email: "E-posta okundu",
  create_email_reply_draft: "Taslak onaya gönderildi",
  list_bills: "Faturalar kontrol edildi",
  mark_bill_paid: "Fatura güncellendi",
  get_weather_forecast: "Hava durumu kontrol edildi",
  web_search: "Web'de arandı",
};

export function activityLabel(toolName: string): string {
  return TOOL_ACTIVITY_LABELS[toolName] ?? toolName;
}
