type DashboardPageProps = {
  children?: React.ReactNode;
};

export default function DashboardPage(props: DashboardPageProps) {
  return (
    <div>
      <h1>Dashboard</h1>
      {props.children}
    </div>
  );
}
