'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api/axios';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { Download, Eye } from 'lucide-react';

interface LogData {
    id: string;
    action: 'VIEW' | 'DOWNLOAD';
    ip: string | null;
    userAgent: string | null;
    createdAt: string;
    file: {
        id: string;
        name: string;
    };
    linkToken: string;
}

export default function AdminLogs() {
    const [logs, setLogs] = useState<LogData[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionFilter, setActionFilter] = useState<string>('all');
    const [page, setPage] = useState(0);
    const [total, setTotal] = useState(0);
    const pageSize = 20;

    useEffect(() => {
        loadLogs();
    }, [page, actionFilter]);

    const loadLogs = async () => {
        try {
            const params: any = {
                skip: page * pageSize,
                take: pageSize,
            };

            if (actionFilter !== 'all') {
                params.action = actionFilter;
            }

            const response = await api.get('/admin/logs', { params });
            setLogs(response.data.data);
            setTotal(response.data.meta.total);
        } catch (error: any) {
            toast.error('Failed to load logs');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <div className="flex items-center justify-center h-64">Loading...</div>;
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle>Access Logs</CardTitle>
                        <div className="flex items-center gap-2">
                            <Select value={actionFilter} onValueChange={(value) => {
                                setActionFilter(value);
                                setPage(0);
                            }}>
                                <SelectTrigger className="w-40">
                                    <SelectValue placeholder="Filter by action" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Actions</SelectItem>
                                    <SelectItem value="VIEW">Views Only</SelectItem>
                                    <SelectItem value="DOWNLOAD">Downloads Only</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Timestamp</TableHead>
                                    <TableHead>Action</TableHead>
                                    <TableHead>File</TableHead>
                                    <TableHead>IP Address</TableHead>
                                    <TableHead>User Agent</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {logs.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center text-muted-foreground">
                                            No logs found
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    logs.map((log) => (
                                        <TableRow key={log.id}>
                                            <TableCell className="whitespace-nowrap">
                                                {format(new Date(log.createdAt), 'MMM d, yyyy HH:mm:ss')}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    {log.action === 'DOWNLOAD' ? (
                                                        <>
                                                            <Download size={16} className="text-green-600" />
                                                            <span className="text-green-600 font-medium">Download</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Eye size={16} className="text-blue-600" />
                                                            <span className="text-blue-600 font-medium">View</span>
                                                        </>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className="font-medium">{log.file.name}</TableCell>
                                            <TableCell className="font-mono text-sm">{log.ip || 'N/A'}</TableCell>
                                            <TableCell className="max-w-xs truncate text-sm text-muted-foreground">
                                                {log.userAgent || 'N/A'}
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
