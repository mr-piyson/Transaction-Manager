'use client';
type SetupLayoutProps = {
  children?: React.ReactNode;
};
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '../app/layout';
export default function SetupLayout(props: SetupLayoutProps) {
  return (
    <QueryClientProvider client={queryClient}>
      {props.children}
    </QueryClientProvider>
  );
}
