'use client';

import { useState, use } from 'react';
import { Download, Lock, FileText, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api/axios';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';

export default function DownloadPage({ params }: { params: Promise<{ token: string }> }) {
    const resolvedParams = use(params);
    const token = resolvedParams.token;

    const [password, setPassword] = useState('');
    const [downloading, setDownloading] = useState(false);

    const { data: verifyData, isError, error, refetch } = useQuery({
        queryKey: ['verify', token],
        queryFn: async () => {
            // If password is required, this will fail initially with 403 or 400
            // We handle it gracefully below
            const res = await api.post(`/links/${token}/verify`, {
                password: password || undefined,
            });
            return res.data;
        },
        retry: false,
        enabled: false, // Don't run automatically if we suspect password might be needed
    });

    // Initial check on mount
    useState(() => {
        // Attempt verification without password first
        refetch();
    });

    const handleDownload = async () => {
        setDownloading(true);
        try {
            const res = await api.get(`/links/${token}/download`);
            const { downloadUrl } = res.data;

            // Trigger download
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.setAttribute('download', 'download');
            document.body.appendChild(link);
            link.click();
            link.remove();

            toast.success('Download started');
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Download failed');
        } finally {
            setDownloading(false);
        }
    };

    const handlePasswordSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        refetch();
    };

    const isPasswordRequired = error && (error as any).response?.status === 400 && (error as any).response?.data?.message === 'Password required';
    const isInvalidPassword = error && (error as any).response?.status === 403 && (error as any).response?.data?.message === 'Invalid password';
    const isExpired = error && (error as any).response?.status === 403 && (error as any).response?.data?.message === 'This link has expired';
    const isLimitExceeded = error && (error as any).response?.status === 403 && (error as any).response?.data?.message === 'Download limit exceeded';

    return (
        <main className="flex min-h-screen items-center justify-center p-4 bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-gray-900 dark:to-gray-950">
            <Card className="w-full max-w-md shadow-2xl border-0 overflow-hidden">
                <div className="h-2 bg-gradient-to-r from-blue-500 to-indigo-600 w-full" />
                <CardContent className="p-8">
                    <AnimatePresence mode="wait">
                        {isExpired || isLimitExceeded ? (
                            <motion.div
                                key="error"
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="text-center space-y-4"
                            >
                                <div className="mx-auto w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center text-red-600 dark:text-red-400">
                                    <AlertTriangle size={32} />
                                </div>
                                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Link Unavailable</h2>
                                <p className="text-gray-500 dark:text-gray-400">
                                    {isLimitExceeded ? 'This link has reached its download limit.' : 'This link has expired.'}
                                </p>
                            </motion.div>
                        ) : isPasswordRequired || isInvalidPassword ? (
                            <motion.div
                                key="password"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="space-y-6"
                            >
                                <div className="text-center">
                                    <div className="mx-auto w-12 h-12 bg-yellow-100 dark:bg-yellow-900/20 rounded-full flex items-center justify-center text-yellow-600 dark:text-yellow-400 mb-4">
                                        <Lock size={24} />
                                    </div>
                                    <h2 className="text-xl font-bold">Password Protected</h2>
                                    <p className="text-gray-500 text-sm mt-1">Please enter the password to access this file.</p>
                                </div>

                                <form onSubmit={handlePasswordSubmit} className="space-y-4">
                                    <div className="space-y-2">
                                        <Input
                                            type="password"
                                            placeholder="Enter password..."
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className={isInvalidPassword ? 'border-red-500 focus-visible:ring-red-500' : ''}
                                        />
                                        {isInvalidPassword && (
                                            <p className="text-xs text-red-500">Incorrect password, please try again.</p>
                                        )}
                                    </div>
                                    <Button type="submit" className="w-full" disabled={!password}>
                                        Unlock
                                    </Button>
                                </form>
                            </motion.div>
                        ) : verifyData ? (
                            <motion.div
                                key="download"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="text-center space-y-6"
                            >
                                <div className="mx-auto w-20 h-20 bg-blue-100 dark:bg-blue-900/20 rounded-2xl flex items-center justify-center text-blue-600 dark:text-blue-400">
                                    <FileText size={40} />
                                </div>

                                <div className="space-y-1">
                                    <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 truncate max-w-[280px] mx-auto">
                                        {verifyData.file.name}
                                    </h2>
                                    <p className="text-gray-500 dark:text-gray-400">
                                        {(parseInt(verifyData.file.size) / (1024 * 1024)).toFixed(2)} MB
                                    </p>
                                </div>

                                <Button
                                    size="lg"
                                    className="w-full h-12 text-lg gap-2 bg-blue-600 hover:bg-blue-700"
                                    onClick={handleDownload}
                                    disabled={downloading}
                                >
                                    {downloading ? 'Downloading...' : (
                                        <>
                                            <Download size={20} /> Download File
                                        </>
                                    )}
                                </Button>
                            </motion.div>
                        ) : (
                            <div className="flex justify-center p-8">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                            </div>
                        )}
                    </AnimatePresence>
                </CardContent>
            </Card>
        </main>
    );
}
