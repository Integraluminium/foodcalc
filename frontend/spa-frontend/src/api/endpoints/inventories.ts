import { api } from '../client'
import type { Inventory, InventoryItemWithName } from '../types'

export interface InventoryCreateInput {
  name: string
  group_id: number
}

export interface InventoryItemInput {
  ingredient_id: number
  /** Decimal string, amount in kg. */
  amount: string
}

export const inventoriesApi = {
  list: () => api.get<Inventory[]>('/inventories'),
  detail: (id: number) => api.get<Inventory>(`/inventories/${id}`),
  items: (id: number) => api.get<InventoryItemWithName[]>(`/inventories/${id}/items`),
  create: (input: InventoryCreateInput) => api.post<Inventory>('/inventories', input),
  update: (id: number, input: Partial<InventoryCreateInput>) =>
    api.put<Inventory>(`/inventories/${id}`, input),
  remove: (id: number) => api.delete<void>(`/inventories/${id}`),

  addItem: (id: number, input: InventoryItemInput) =>
    api.post<InventoryItemWithName>(`/inventories/${id}/items`, input),
  updateItem: (id: number, ingredientId: number, amount: string) =>
    api.put<InventoryItemWithName>(`/inventories/${id}/items/${ingredientId}`, {
      amount,
    }),
  removeItem: (id: number, ingredientId: number) =>
    api.delete<void>(`/inventories/${id}/items/${ingredientId}`),
}
