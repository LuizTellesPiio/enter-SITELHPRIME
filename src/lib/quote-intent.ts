/**
 * Repasse das referências de cor escolhidas na "Prévia de Cores LH Prime"
 * para o formulário de orçamento existente (seção Contato da Home).
 *
 * Mantém apenas os nomes das cores até o envio do formulário; após o uso,
 * a lista é limpa para evitar reutilização indevida em um próximo contato.
 */

let colorRefs: string[] = [];

export const setQuoteColors = (colors: string[]) => {
  colorRefs = colors;
};

export const getQuoteColors = (): string[] => colorRefs;

export const clearQuoteColors = () => {
  colorRefs = [];
};
