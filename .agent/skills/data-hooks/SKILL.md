---
name: data-hooks
description: Handles everything related to the data hooks api data related hooks to get data from the api and update the data in the api
---

## 1. Data Fetching (Queries)

When using `useResources` or `useGetResource`, always destructure state for UX feedback.

### ✅ Basic Pattern

```ts
const { data: customers, isLoading, isError } = useCustomers();

if (isLoading) return <LoadingSkeleton />;
if (isError) return <ErrorMessage message="Failed to load customers" />;

return (
  <ul>
    {customers?.map(customer => (
      <li key={customer.id}>{customer.name}</li>
    ))}
  </ul>
);
```

---

### ⚙️ Passing Options

Hooks accept TanStack Query options without modifying the hook itself.

```ts
const { data: customer } = useGetCustomer(id, {
  staleTime: 1000 * 60 * 5, // 5 minutes
});
```

Common options:

- `enabled`
- `staleTime`
- `refetchOnWindowFocus`
- `retry`

---

## 2. Data Modification (Mutations)

Mutations should always provide **clear user feedback**.

### ✅ Create / Update Pattern

```ts
const updateCustomer = useUpdateCustomer();

const handleSubmit = async (values: Partial<Customer>) => {
  try {
    await updateCustomer.mutateAsync({
      id: customerId,
      data: values,
    });

    toast.success('Customer updated successfully!');
  } catch (error) {
    toast.error('Failed to update customer.');
  }
};
```

### 🔘 Button Feedback

```tsx
<button disabled={updateCustomer.isPending}>
  {updateCustomer.isPending ? 'Saving...' : 'Save Changes'}
</button>
```

---

## 3. Best Practices

### A. ⚡ Prefetching on Hover

Improves perceived performance.

```ts
const queryClient = useQueryClient();

const onMouseEnter = () => {
  queryClient.prefetchQuery({
    queryKey: CustomersKeys.detail(id),
    queryFn: () => api.get(`/api/customers/${id}`).then((res) => res.data),
  });
};
```

---

### B. 🛡 Defensive Coding

Hooks like `useGetCustomer(id)` often use:

```ts
enabled: !!id;
```

So `data` is initially `undefined`.

Always guard:

```ts
customer?.name;
```

or:

```ts
if (!customer) return null;
```

---

### C. 🔄 mutate vs mutateAsync

| Method          | Use Case                            |
| --------------- | ----------------------------------- |
| `mutate()`      | Fire-and-forget                     |
| `mutateAsync()` | Await result (forms, modals, flows) |

---

## 4. Hook Usage Summary

| Hook                  | Purpose           | Trigger                      |
| --------------------- | ----------------- | ---------------------------- |
| `useResources()`      | Fetch list        | Page load / filters          |
| `useGetResource(id)`  | Fetch single item | Detail page / edit modal     |
| `useCreateResource()` | Create new item   | Form submit                  |
| `useUpdateResource()` | Update item       | Save / inline edit           |
| `useDeleteResource()` | Delete item       | Delete action / confirmation |

---

## 5. Conventions

- Always handle:
  - `isLoading`
  - `isError`

- Never assume `data` exists
- Prefer `mutateAsync` for controlled flows
- Keep hooks **pure** (no UI logic inside hooks)
- UI handles:
  - toasts
  - navigation
  - modals

---

## 6. Integration Notes

This skill activates when:

- Antigravity detects TanStack Query usage
- Resource hooks follow naming patterns:
  - `useX`
  - `useGetX`
  - `useCreateX`
  - `useUpdateX`
  - `useDeleteX`

---

## 📦 Hook Source (IMPORTANT)

All resource hooks are **created and read from**:

```ts
@/hooks/data/[use-resource.ts]
```

## ✅ Outcome

Following this skill guarantees:

- Consistent UI behavior
- Faster perceived performance
- Safer async handling
- Scalable hook architecture

---

```

---

If you want, I can also generate:
- the **actual hook factory (CRUD generator)** behind this skill
- or a **full Antigravity plugin scaffold** that auto-creates these hooks from an API schema
```
