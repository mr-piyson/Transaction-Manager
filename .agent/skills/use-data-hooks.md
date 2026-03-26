# Skill: Consuming Antigravity Hooks

This skill defines the standard for implementing UI components that interact with the resource hooks. It ensures a consistent user experience (UX) by handling asynchronous states and cache synchronization properly.

## 1. Data Fetching (Queries)

When using useResources or useGetResource, always destructure the necessary states to provide immediate feedback to the user.

Basic Pattern

```TypeScript
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

Passing OptionsYou can pass TanStack Query options (like refetchOnWindowFocus or enabled) to the hooks to control behavior without modifying the hook itself.

```TypeScript
const { data: customer } = useGetCustomer(id, {
staleTime: 1000 _ 60 _ 5, // 5 minutes
});
```

## 2. Data Modification (Mutations)

Mutations should be handled with clear intent, usually paired with a UI feedback mechanism like a "Toast" notification or a redirect.Handling "Create" or "Update"

```TypeScript
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

// Use isLoading on the button for feedback
<button disabled={updateCustomer.isPending}>
{updateCustomer.isPending ? 'Saving...' : 'Save Changes'}
</button>
```

## 3. Best Practices for Implementation

A. Prefetching on HoverTo make the app feel instantaneous, prefetch data when a user hovers over a link using the queryClient.

```TypeScript

const queryClient = useQueryClient();

const onMouseEnter = () => {
queryClient.prefetchQuery({
queryKey: CustomersKeys.detail(id),
queryFn: () => api.get(`/api/customers/${id}`).then(res => res.data),
});
};
```

B. Defensive Coding with undefinedSince useGetCustomer uses enabled: !!id, the data returned will be undefined initially. Always use optional chaining (customer?.name) or logical guards.

C. Mutation vs MutationAsync

- Use .mutate() for simple "fire and forget" actions where onSuccess in the hook handles the logic.
- Use .mutateAsync() when you need to await the result inside the component (e.g., closing a modal only after the server responds).

## 4. Summary Table: Hook Usage

HookPurposeCommon TriggeruseResources()Fetching a listPage Load / Filter ChangeuseGetResource(id)Fetching one itemDetail Page / Edit ModaluseCreateResource()Adding new dataForm SubmissionuseUpdateResource()Modifying dataInline Edit / Form SaveuseDeleteResource()Removing dataDelete Button / Confirmation
