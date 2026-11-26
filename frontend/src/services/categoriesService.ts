import { apiPost } from "./api";

export type RenameCategoryOptions = {
  from: string;
  to: string;
};

/**
 * Renames a folder and everything below it, in all scopes.
 *
 * @returns How many HA categories were renamed.
 */
export async function renameCategory({ from, to }: RenameCategoryOptions): Promise<number> {
  const result = await apiPost<{ renamedCount: number }>({
    path: "/categories/rename",
    body: { from, to },
  });

  return result.renamedCount;
}
