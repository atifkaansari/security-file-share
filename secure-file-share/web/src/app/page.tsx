'use client';

import { useCallback, useState, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { io } from 'socket.io-client';
import { UploadCloud, CheckCircle, Lock, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { api, API_URL } from '@/lib/api/axios';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadedFileId, setUploadedFileId] = useState<string | null>(null);
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [isPasswordEnabled, setIsPasswordEnabled] = useState(false);

  // Socket connection
  useEffect(() => {
    const socket = io(API_URL.replace('/api', ''), {
      path: '/socket.io',
      transports: ['websocket'],
    });

    socket.on('upload:progress', (data) => {
      // Handle server-side progress if needed
      // Currently using client-side axios progress
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: false,
    maxSize: 5 * 1024 * 1024 * 1024, // 5GB limit
  });

  const uploadFile = async () => {
    if (!file) return;

    setUploading(true);
    setProgress(0);

    try {
      // 1. Init upload
      const initRes = await api.post('/files/init-upload', {
        fileName: file.name,
        mimeType: file.type,
        fileSize: file.size,
      });

      const { fileId, uploadId, uploadUrls } = initRes.data;
      const parts: { ETag: string; PartNumber: number }[] = [];
      const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB

      // 2. Upload parts
      for (let i = 0; i < uploadUrls.length; i++) {
        const { url, partNumber } = uploadUrls[i];
        const start = i * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, file.size);
        const chunk = file.slice(start, end);

        const uploadRes = await axios.put(url, chunk, {
          headers: { 'Content-Type': file.type },
          onUploadProgress: (progressEvent) => {
            const totalUploaded = start + (progressEvent.loaded || 0);
            const percent = Math.round((totalUploaded / file.size) * 100);
            setProgress(percent);
          },
        });

        parts.push({
          ETag: uploadRes.headers.etag,
          PartNumber: partNumber,
        });
      }

      // 3. Complete upload
      await api.post('/files/complete-upload', {
        fileId,
        uploadId,
        parts,
      });

      setUploadedFileId(fileId);
      toast.success('File uploaded successfully!');
    } catch (error) {
      console.error(error);
      toast.error('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const createLink = async () => {
    if (!uploadedFileId) return;

    try {
      const res = await api.post('/links', {
        fileId: uploadedFileId,
        password: isPasswordEnabled ? password : undefined,
      });

      const link = `${window.location.origin}/d/${res.data.token}`;
      setShareLink(link);
      toast.success('Share link created!');
    } catch (error) {
      toast.error('Failed to create link');
    }
  };

  const copyLink = () => {
    if (shareLink) {
      navigator.clipboard.writeText(shareLink);
      toast.success('Link copied to clipboard');
    }
  };

  const resetUpload = () => {
    setFile(null);
    setUploadedFileId(null);
    setShareLink(null);
    setProgress(0);
    setPassword('');
    setIsPasswordEnabled(false);
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950">
      <Card className="w-full max-w-xl shadow-xl border-t-4 border-t-indigo-500">
        <CardContent className="p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold tracking-tight mb-2">Secure File Share</h1>
            <p className="text-muted-foreground">Upload and share files securely with enterprise-grade encryption.</p>
          </div>

          <AnimatePresence mode="wait">
            {!file && (
              <motion.div
                key="dropzone"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <div
                  {...getRootProps()}
                  className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors ${isDragActive
                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/20'
                    : 'border-gray-200 hover:border-gray-300 dark:border-gray-800'
                    }`}
                >
                  <input {...getInputProps()} />
                  <div className="flex flex-col items-center gap-4">
                    <div className="p-4 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
                      <UploadCloud size={48} />
                    </div>
                    <div>
                      <p className="text-lg font-medium">Drag & drop your file here</p>
                      <p className="text-sm text-muted-foreground mt-1">or click to browse</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {file && !uploadedFileId && (
              <motion.div
                key="uploading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-6"
              >
                <div className="flex items-center gap-4 p-4 border rounded-lg bg-white dark:bg-gray-900">
                  <div className="p-3 rounded-lg bg-indigo-100 dark:bg-indigo-900/30">
                    <CheckCircle className="text-indigo-600 dark:text-indigo-400" size={24} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{file.name}</p>
                    <p className="text-sm text-muted-foreground">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={resetUpload} disabled={uploading}>
                    Cancel
                  </Button>
                </div>

                {uploading ? (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Uploading...</span>
                      <span>{progress}%</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                  </div>
                ) : (
                  <Button className="w-full h-12 text-lg" onClick={uploadFile}>
                    Upload File
                  </Button>
                )}
              </motion.div>
            )}

            {uploadedFileId && !shareLink && (
              <motion.div
                key="settings"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-6"
              >
                <div className="flex items-center gap-2 text-green-600 mb-4 justify-center">
                  <CheckCircle size={24} />
                  <span className="font-medium">File uploaded successfully</span>
                </div>

                <div className="space-y-4 border p-4 rounded-lg bg-gray-50 dark:bg-gray-900/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Lock size={18} className="text-muted-foreground" />
                      <Label htmlFor="password-mode">Password Protection</Label>
                    </div>
                    <Switch
                      id="password-mode"
                      checked={isPasswordEnabled}
                      onCheckedChange={setIsPasswordEnabled}
                    />
                  </div>

                  {isPasswordEnabled && (
                    <div className="pt-2">
                      <Input
                        type="password"
                        placeholder="Enter a secure password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                    </div>
                  )}
                </div>

                <Button className="w-full h-12 text-lg" onClick={createLink}>
                  Get Share Link
                </Button>
              </motion.div>
            )}

            {shareLink && (
              <motion.div
                key="result"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-6 text-center"
              >
                <div className="p-6 bg-green-50 dark:bg-green-950/20 rounded-xl border border-green-100 dark:border-green-900 mb-6">
                  <h3 className="text-lg font-semibold text-green-800 dark:text-green-300 mb-2">Ready to share!</h3>
                  <p className="text-green-600 dark:text-green-400">Your secure link has been generated.</p>
                </div>

                <div className="flex gap-2">
                  <Input readOnly value={shareLink} className="font-mono text-center" />
                  <Button size="icon" onClick={copyLink}>
                    <Copy size={18} />
                  </Button>
                </div>

                <Button variant="outline" className="mt-4" onClick={resetUpload}>
                  Upload Another File
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>

      <div className="mt-8 text-center text-sm text-muted-foreground">
        <p>© 2024 Secure File Share. Enterprise Grade Security.</p>
      </div>
    </main>
  );
}
