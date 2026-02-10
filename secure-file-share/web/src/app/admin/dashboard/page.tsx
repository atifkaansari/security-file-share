'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api/axios';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Files, Download, HardDrive, Users, Trash2, Search } from 'lucide-react';
import { format } from 'date-fns';

interface Stats {
    totalFiles: number;
    totalUsers: number;
    totalDownloads: number;
    totalStorage: string;
}

interface FileData {
    id: string;
    originalName: string;
    size: string;
    createdAt: string;
    shareLinksCount: number;
    totalDownloads: number;
    uploader?: { email: string };
}

export default function AdminDashboard() {
    const [stats, setStats] = useState<Stats | null>(null);
    const [files, setFiles] = useState<FileData[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(0);
    const [total, setTotal] = useState(0);
    const pageSize = 10;

    useEffect(() => {
        loadData();
    }, [page, search]);

    const loadData = async () => {
        try {
            const [statsRes, filesRes] = await Promise.all([
                api.get('/admin/stats'),
                api.get(`/admin/files?skip=${page * pageSize}&take=${pageSize}&search=${search}`),
            ]);

            setStats(statsRes.data);
            setFiles(filesRes.data.data);
            setTotal(filesRes.data.meta.total);
        } catch (error: any) {
            toast.error('Failed to load data');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`Delete "${name}"? This will also delete all associated share links.`)) {
            return;
        }

        try {
            await api.delete(`/admin/files/${id}`);
            toast.success('File deleted successfully');
            loadData();
        } catch (error: any) {
            toast.error('Failed to delete file');
        }
    };

    const formatBytes = (bytes: string) => {
        const num = parseInt(bytes, 10);
        if (num === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(num) / Math.log(k));
        return `${(num / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
    };

    if (loading) {
        return <div className="flex items-center justify-center h-64">Loading...</div>;
    }

    return (
        <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Total Files</CardTitle>
                        <Files className="w-4 h-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats?.totalFiles || 0}</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Total Downloads</CardTitle>
                        <Download className="w-4 h-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats?.totalDownloads || 0}</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Storage Used</CardTitle>
                        <HardDrive className="w-4 h-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatBytes(stats?.totalStorage || '0')}</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Total Users</CardTitle>
                        <Users className="w-4 h-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats?.totalUsers || 0}</div>
                    </CardContent>
                </Card>
            </div>

            {/* Files Table */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle>Files</CardTitle>
                        <div className="flex items-center gap-2">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search files..."
                                    value={search}
                                    onChange={(e) => {
                                        setSearch(e.target.value);
                                        setPage(0);
                                    }}
                                    className="pl-9 w-64"
                                />
                            </div>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>File Name</TableHead>
                                    <TableHead>Size</TableHead>
                                    <TableHead>Uploaded</TableHead>
                                    <TableHead>Links</TableHead>
                                    <TableHead>Downloads</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {files.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center text-muted-foreground">
                                            No files found
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    files.map((file) => (
                                        <TableRow key={file.id}>
                                            <TableCell className="font-medium">{file.originalName}</TableCell>
                                            <TableCell>{formatBytes(file.size)}</TableCell>
                                            <TableCell>{format(new Date(file.createdAt), 'MMM d, yyyy')}</TableCell>
                                            <TableCell>{file.shareLinksCount}</TableCell>
                                            <TableCell>{file.totalDownloads}</TableCell>
                                            <TableCell className="text-right">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleDelete(file.id, file.originalName)}
                                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                                >
                                                    <Trash2 size={16} />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    {/* Pagination */}
                    {total > pageSize && (
                        <div className="flex items-center justify-between mt-4">
                            <p className="text-sm text-muted-foreground">
                                Showing {page * pageSize + 1} to {Math.min((page + 1) * pageSize, total)} of {total}
                            </p>
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setPage(page - 1)}
                                    disabled={page === 0}
                                >
                                    Previous
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setPage(page + 1)}
                                    disabled={(page + 1) * pageSize >= total}
                                >
                                    Next
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
