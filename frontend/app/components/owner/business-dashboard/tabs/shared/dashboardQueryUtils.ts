export type DashboardQueryError = {
  message: string;
};

type DashboardQueryResult<T> = {
  data: T[] | null;
  error: DashboardQueryError | null;
};

const DASHBOARD_PAGE_SIZE = 1000;

export async function loadAllDashboardRows<T>(
  loadPage: (
    from: number,
    to: number,
  ) => PromiseLike<DashboardQueryResult<T>>,
): Promise<DashboardQueryResult<T>> {
  const rows: T[] = [];

  for (let from = 0; ; from += DASHBOARD_PAGE_SIZE) {
    const result = await loadPage(from, from + DASHBOARD_PAGE_SIZE - 1);
    if (result.error) return { data: null, error: result.error };

    const page = result.data ?? [];
    rows.push(...page);
    if (page.length < DASHBOARD_PAGE_SIZE) break;
  }

  return { data: rows, error: null };
}
