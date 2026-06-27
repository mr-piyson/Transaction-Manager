'use client';

import { type Editor, useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Placeholder from '@tiptap/extension-placeholder';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  List,
  ListOrdered,
  AlignLeft,
  AlignRight,
} from 'lucide-react';
import { Toggle } from '@/components/ui/toggle';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

interface RichtextEditorProps {
  value?: string;
  onChange?: (html: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  minHeight?: string;
}

function ToolbarButton({ editor, icon: Icon, action, isActive }: {
  editor: Editor;
  icon: typeof Bold;
  action: () => void;
  isActive: boolean;
}) {
  return (
    <Toggle
      size="sm"
      pressed={isActive}
      onPressedChange={action}
      disabled={!editor}
    >
      <Icon className="size-4" />
    </Toggle>
  );
}

export function RichtextEditor({
  value,
  onChange,
  placeholder = 'Type here...',
  className,
  disabled,
  minHeight = '120px',
}: RichtextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextAlign.configure({ types: ['paragraph', 'heading'] }),
      Placeholder.configure({ placeholder }),
    ],
    content: value || '',
    onUpdate: ({ editor }) => {
      onChange?.(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none px-3 py-2',
        style: `min-height: ${minHeight}`,
      },
    },
    editable: !disabled,
  });

  const toggleDir = () => {
    if (!editor) return;
    const current = editor.view.dom.getAttribute('dir');
    const next = current === 'rtl' ? 'ltr' : 'rtl';
    editor.view.dom.setAttribute('dir', next);
  };

  const dir = editor?.view.dom.getAttribute('dir') ?? 'ltr';

  return (
    <div className={cn('border rounded-md overflow-hidden', disabled && 'opacity-50 pointer-events-none', className)}>
      <div className="flex items-center gap-1 p-1 border-b bg-muted/30 flex-wrap">
        <ToolbarButton
          editor={editor!}
          icon={Bold}
          action={() => editor?.chain().focus().toggleBold().run()}
          isActive={editor?.isActive('bold') ?? false}
        />
        <ToolbarButton
          editor={editor!}
          icon={Italic}
          action={() => editor?.chain().focus().toggleItalic().run()}
          isActive={editor?.isActive('italic') ?? false}
        />
        <ToolbarButton
          editor={editor!}
          icon={UnderlineIcon}
          action={() => editor?.chain().focus().toggleUnderline().run()}
          isActive={editor?.isActive('underline') ?? false}
        />

        <Separator orientation="vertical" className="h-5 mx-1" />

        <ToolbarButton
          editor={editor!}
          icon={List}
          action={() => editor?.chain().focus().toggleBulletList().run()}
          isActive={editor?.isActive('bulletList') ?? false}
        />
        <ToolbarButton
          editor={editor!}
          icon={ListOrdered}
          action={() => editor?.chain().focus().toggleOrderedList().run()}
          isActive={editor?.isActive('orderedList') ?? false}
        />

        <Separator orientation="vertical" className="h-5 mx-1" />

        <Toggle
          size="sm"
          pressed={dir === 'ltr'}
          onPressedChange={() => {
            if (dir !== 'ltr') toggleDir();
          }}
          disabled={!editor}
          title="Left-to-right"
        >
          <AlignLeft className="size-4" />
        </Toggle>
        <Toggle
          size="sm"
          pressed={dir === 'rtl'}
          onPressedChange={() => {
            if (dir !== 'rtl') toggleDir();
          }}
          disabled={!editor}
          title="Right-to-left"
        >
          <AlignRight className="size-4" />
        </Toggle>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
