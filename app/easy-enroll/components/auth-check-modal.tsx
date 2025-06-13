'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

interface AuthCheckModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function AuthCheckModal({ isOpen, onClose }: AuthCheckModalProps) {
    const router = useRouter();

    const handleSignIn = () => {
        router.push('/auth?returnTo=/easy-enroll');
    };

    const handleSignUp = () => {
        router.push('/sign-up?returnTo=/easy-enroll');
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Sign in to Continue</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <p className="text-muted-foreground">
                        Please sign in or create an account to continue with your enrollment.
                    </p>
                    <div className="flex flex-col space-y-2">
                        <Button 
                            className="w-full"
                            onClick={handleSignIn}
                        >
                            Sign In
                        </Button>
                        <Button 
                            variant="outline" 
                            className="w-full"
                            onClick={handleSignUp}
                        >
                            Create Account
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
} 