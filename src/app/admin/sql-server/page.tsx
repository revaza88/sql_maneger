"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Server, Database, Plus, Trash2, Settings, TestTube } from "lucide-react";
import { sqlServerConfigApi } from "@/lib/api";
import { useAuthStore } from "@/lib/store/auth-store";
import { useRouter } from "next/navigation";
import { LoadingSpinner } from "@/components/loading-spinner";

// SQL Server კონფიგურაციის სქემა
const sqlServerSchema = z.object({
  serverName: z.string().min(1, "Server name is required"),
  serverAddress: z.string().min(1, "Server address is required"),
  port: z.string().optional(),
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
  database: z.string().optional(),
  connectionTimeout: z.string().optional(),
  requestTimeout: z.string().optional(),
  trustServerCertificate: z.boolean().optional(),
  encrypt: z.boolean().optional(),
});

type SqlServerFormData = z.infer<typeof sqlServerSchema>;

interface SqlServerConnection {
  id: string;
  serverName: string;
  serverAddress: string;
  port?: string;
  username: string;
  database?: string;
  status: 'connected' | 'disconnected' | 'testing';
  lastConnected?: string;
  createdAt: string;
}

export default function SqlServerManagePage() {
  const [connections, setConnections] = useState<SqlServerConnection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [testingConnection, setTestingConnection] = useState<string | null>(null);
  const { user, token } = useAuthStore();
  const router = useRouter();

  // Authorization check
  useEffect(() => {
    if (!token || !user || user.role?.toLowerCase() !== 'admin') {
      router.push('/admin/login');
      return;
    }
  }, [token, user, router]);

  const form = useForm<SqlServerFormData>({
    resolver: zodResolver(sqlServerSchema),
    defaultValues: {
      serverName: "",
      serverAddress: "",
      port: "1433",
      username: "",
      password: "",
      database: "master",
      connectionTimeout: "30",
      requestTimeout: "30",
      trustServerCertificate: true,
      encrypt: false,
    },
  });
  // კავშირების ჩატვირთვა
  const loadConnections = async () => {
    try {
      setIsLoading(true);
      const response = await sqlServerConfigApi.getConnections();
      setConnections(response.data);
    } catch (error) {
      console.error("Error loading connections:", error);
      toast.error("Failed to load SQL Server connections");
    } finally {
      setIsLoading(false);
    }
  };
  // ახალი კავშირის დამატება
  const onSubmit = async (data: SqlServerFormData) => {
    try {
      setIsSaving(true);
      
      const response = await sqlServerConfigApi.addConnection(data);
      setConnections(prev => [...prev, response.data]);
      toast.success("SQL Server connection added successfully");
      form.reset();
    } catch (error) {
      console.error("Error adding connection:", error);
      toast.error("Failed to add SQL Server connection");
    } finally {
      setIsSaving(false);
    }
  };
  // კავშირის ტესტირება
  const testConnection = async (connectionId: string) => {
    try {
      setTestingConnection(connectionId);
      
      const response = await sqlServerConfigApi.testConnection(connectionId);
      
      setConnections(prev => prev.map(conn => 
        conn.id === connectionId 
          ? response.data
          : conn
      ));
      
      toast.success("Connection test successful");
    } catch (error) {
      console.error("Error testing connection:", error);
      setConnections(prev => prev.map(conn => 
        conn.id === connectionId 
          ? { ...conn, status: "disconnected" }
          : conn
      ));
      toast.error("Connection test failed");
    } finally {
      setTestingConnection(null);
    }
  };
  // კავშირის წაშლა
  const deleteConnection = async (connectionId: string) => {
    try {
      await sqlServerConfigApi.deleteConnection(connectionId);
      setConnections(prev => prev.filter(conn => conn.id !== connectionId));
      toast.success("SQL Server connection deleted");
    } catch (error) {
      console.error("Error deleting connection:", error);
      toast.error("Failed to delete connection");
    }
  };

  useEffect(() => {
    loadConnections();
  }, []);

  const getStatusBadge = (status: SqlServerConnection['status']) => {
    switch (status) {
      case 'connected':
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">Connected</Badge>;
      case 'disconnected':
        return <Badge variant="secondary">Disconnected</Badge>;
      case 'testing':
        return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300">Testing...</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }  };

  // Show loading if user is not authenticated or not admin
  if (!token || !user || user.role?.toLowerCase() !== 'admin') {
    return <LoadingSpinner />;
  }

  return (
    <div className="container mx-auto p-6 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">SQL Server Management</h1>
          <p className="text-muted-foreground mt-2">
            Configure and manage SQL Server connections for the application
          </p>
        </div>
        <Server className="h-8 w-8 text-muted-foreground" />
      </div>

      {/* ახალი კავშირის ფორმა */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Add New SQL Server Connection
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="serverName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Server Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Production SQL Server" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="serverAddress"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Server Address</FormLabel>
                      <FormControl>
                        <Input placeholder="localhost or IP address" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="port"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Port</FormLabel>
                      <FormControl>
                        <Input placeholder="1433" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="database"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Default Database</FormLabel>
                      <FormControl>
                        <Input placeholder="master" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username</FormLabel>
                      <FormControl>
                        <Input placeholder="sa" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="••••••••" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <FormField
                  control={form.control}
                  name="connectionTimeout"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Connection Timeout (seconds)</FormLabel>
                      <FormControl>
                        <Input placeholder="30" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="requestTimeout"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Request Timeout (seconds)</FormLabel>
                      <FormControl>
                        <Input placeholder="30" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex items-end">
                  <Button type="submit" disabled={isSaving} className="w-full">
                    {isSaving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Adding...
                      </>
                    ) : (
                      <>
                        <Plus className="mr-2 h-4 w-4" />
                        Add Connection
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* არსებული კავშირები */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Existing SQL Server Connections
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              Loading connections...
            </div>
          ) : connections.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Server className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No SQL Server connections configured</p>
              <p className="text-sm">Add your first connection above to get started</p>
            </div>
          ) : (
            <div className="space-y-4">
              {connections.map((connection) => (
                <div
                  key={connection.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:shadow-sm transition-shadow"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold">{connection.serverName}</h3>
                      {getStatusBadge(connection.status)}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {connection.serverAddress}:{connection.port || "1433"} • {connection.database || "master"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Username: {connection.username}
                      {connection.lastConnected && (
                        <> • Last connected: {new Date(connection.lastConnected).toLocaleString()}</>
                      )}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => testConnection(connection.id)}
                      disabled={testingConnection === connection.id}
                    >
                      {testingConnection === connection.id ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Testing...
                        </>
                      ) : (
                        <>
                          <TestTube className="mr-2 h-4 w-4" />
                          Test
                        </>
                      )}
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                    >
                      <Settings className="h-4 w-4" />
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteConnection(connection.id)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
