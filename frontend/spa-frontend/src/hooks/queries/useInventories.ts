import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  inventoriesApi,
  type InventoryCreateInput,
  type InventoryItemInput,
} from '../../api/endpoints/inventories'
import { queryKeys } from '../../api/queryKeys'

const INVENTORIES_ROOT = ['inventories'] as const

/** All inventories the user may access. */
export function useInventories() {
  return useQuery({
    queryKey: queryKeys.inventories.list,
    queryFn: inventoriesApi.list,
  })
}

/** One inventory's frame data. */
export function useInventory(id: number) {
  return useQuery({
    queryKey: queryKeys.inventories.detail(id),
    queryFn: () => inventoriesApi.detail(id),
    enabled: Number.isFinite(id) && id > 0,
  })
}

/** The inventory's stocked items with ingredient names. */
export function useInventoryItems(id: number) {
  return useQuery({
    queryKey: queryKeys.inventories.items(id),
    queryFn: () => inventoriesApi.items(id),
    enabled: Number.isFinite(id) && id > 0,
  })
}

function useInvalidate() {
  const queryClient = useQueryClient()
  return () => {
    void queryClient.invalidateQueries({ queryKey: INVENTORIES_ROOT })
  }
}

export function useCreateInventory() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: (input: InventoryCreateInput) => inventoriesApi.create(input),
    onSuccess: invalidate,
  })
}

/** All editing mutations for one inventory; success refreshes inventory queries. */
export function useInventoryMutations(id: number) {
  const invalidate = useInvalidate()

  const update = useMutation({
    mutationFn: (input: Partial<InventoryCreateInput>) =>
      inventoriesApi.update(id, input),
    onSuccess: invalidate,
  })
  const remove = useMutation({
    mutationFn: () => inventoriesApi.remove(id),
    onSuccess: invalidate,
  })
  const addItem = useMutation({
    mutationFn: (input: InventoryItemInput) => inventoriesApi.addItem(id, input),
    onSuccess: invalidate,
  })
  const updateItem = useMutation({
    mutationFn: (args: { ingredientId: number; amount: string }) =>
      inventoriesApi.updateItem(id, args.ingredientId, args.amount),
    onSuccess: invalidate,
  })
  const removeItem = useMutation({
    mutationFn: (ingredientId: number) =>
      inventoriesApi.removeItem(id, ingredientId),
    onSuccess: invalidate,
  })

  return { update, remove, addItem, updateItem, removeItem }
}
