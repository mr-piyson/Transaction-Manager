'use client';

import { ArrowLeft, Package } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Header } from '@/components/layout/App-Header';
import { ItemImportWizard } from '@/components/items/bulk-import/wizard';

export default function ItemImportPage() {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-1 overflow-y-auto">
        <ItemImportWizard />
      </div>
    </div>
  );
}
