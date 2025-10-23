type NotePageProps = {
  children?: React.ReactNode;
};

export default function Page(props: NotePageProps) {
  return <div>{props.children}</div>;
}
