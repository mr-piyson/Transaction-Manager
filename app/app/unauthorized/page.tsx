'use client';

import { motion } from 'framer-motion';
import { ShieldAlert, ArrowLeft, Home, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen w-full flex mt-11 justify-center bg-background p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="max-w-md w-full border-destructive/80  border-4 shadow-xl bg-card/50 backdrop-blur-sm">
          <CardHeader className="text-center pb-2">
            <div className="flex justify-center ">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="p-4 rounded-full bg-destructive/10 text-destructive"
              >
                <ShieldAlert size={48} strokeWidth={1.5} />
              </motion.div>
            </div>
            <CardTitle className="text-3xl font-bold tracking-tight">
              Access Denied
            </CardTitle>
          </CardHeader>

          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground text-balance">
              It looks like you don&apos;t have the necessary permissions to
              view this page. Please contact your administrator if you believe
              this is an error.
            </p>
            <div className="flex items-center justify-center gap-2 text-xs font-mono text-muted-foreground/60 bg-muted/50 py-1 px-3 rounded-md w-fit mx-auto">
              <Lock size={12} />
              <span>UNAUTHORIZED</span>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col sm:flex-row gap-3 pt-6">
            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={() => window.history.back()}
            >
              Back
            </Button>
          </CardFooter>
        </Card>
      </motion.div>
    </div>
  );
}
