/** "14/09/2026 10:32", no fuso de quem está no balcão. */
export const dataEHora = (iso: string): string =>
  new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

/** Início do dia de hoje menos `dias`, em ISO: o "desde" do histórico. */
export const inicioDoDia = (dias: number, agora = new Date()): string => {
  const data = new Date(agora);
  data.setHours(0, 0, 0, 0);
  data.setDate(data.getDate() - dias);
  return data.toISOString();
};
