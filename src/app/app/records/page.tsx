"use client";
type PageProps = {
  children?: React.ReactNode;
};

export default function Page(props: PageProps) {
  return <>{props.children}</>;
}
