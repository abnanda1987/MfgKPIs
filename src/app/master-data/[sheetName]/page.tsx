"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { SheetSchema, SheetRow, SheetColumn } from "@/lib/types";
import {
  ArrowLeft,
  Search,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Save,
  X,
} from "lucide-react";

export default function MasterDataCrudPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const sheetName = params.sheetName as string;

  const [schema, setSchema] = useState<SheetSchema | null>(null);
  const [records, setRecords] = useState<SheetRow[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<SheetRow[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [formData, setFormData] = useState<SheetRow>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lookupValues, setLookupValues] = useState<Record<string, string[]>>({});

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<SheetRow | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const schemaRes = await fetch(`/api/sheets/schema?sheet=${sheetName}`);
      const schemaData = await schemaRes.json();
      if (schemaData.success) {
        setSchema(schemaData.data);
      }

      const url = user?.plantId
        ? `/api/sheets/${sheetName}?plantId=${user.plantId}`
        : `/api/sheets/${sheetName}`;
      const dataRes = await fetch(url);
      const dataResult = await dataRes.json();

      if (dataResult.success) {
        setRecords(dataResult.data || []);
        setFilteredRecords(dataResult.data || []);
      } else {
        setError(dataResult.error || "Failed to fetch data");
      }
    } catch (err) {
      setError("Failed to load data");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [sheetName, user?.plantId]);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [fetchData, user]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredRecords(records);
      return;
    }
    const lower = searchQuery.toLowerCase();
    const filtered = records.filter((record) =>
      Object.values(record).some((val) =>
        String(val).toLowerCase().includes(lower)
      )
    );
    setFilteredRecords(filtered);
  }, [searchQuery, records]);

  const fetchLookupValues = useCallback(async (columns: SheetColumn[]) => {
    const lookups: Record<string, string[]> = {};
    for (const col of columns) {
      if (col.lookupSheet && col.lookupColumn) {
        try {
          const res = await fetch(`/api/sheets/lookup?sheet=${col.lookupSheet}&column=${col.lookupColumn}`);
          const data = await res.json();
          if (data.success) {
            lookups[col.name] = data.data || [];
          }
        } catch (err) {
          console.error(`Failed to fetch lookup for ${col.name}:`, err);
        }
      }
    }
    setLookupValues(lookups);
  }, []);

  const openCreateModal = () => {
    setModalMode("create");
    setFormData({});
    setEditingId(null);
    setIsModalOpen(true);
    if (schema?.columns) {
      fetchLookupValues(schema.columns);
    }
  };

  const openEditModal = (record: SheetRow) => {
    setModalMode("edit");
    setFormData({ ...record });
    setEditingId(String(record[schema?.primaryKey || ""]) || null);
    setIsModalOpen(true);
    if (schema?.columns) {
      fetchLookupValues(schema.columns);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError("");
    setSuccessMessage("");
    try {
      const url = `/api/sheets/${sheetName}`;
      const method = modalMode === "create" ? "POST" : "PUT";
      const body = modalMode === "create" ? formData : { id: editingId, ...formData };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const result = await res.json();

      if (result.success) {
        setIsModalOpen(false);
        setSuccessMessage(modalMode === "create" ? "Record created successfully" : "Record updated successfully");
        fetchData();
        setTimeout(() => setSuccessMessage(""), 3000);
      } else {
        setError(result.error || "Operation failed");
      }
    } catch (err) {
      setError("Failed to save record");
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget || !schema) return;
    setIsDeleting(true);
    setError("");
    try {
      const id = String(deleteTarget[schema.primaryKey]);
      const res = await fetch(`/api/sheets/${sheetName}?id=${id}`, {
        method: "DELETE",
      });
      const result = await res.json();

      if (result.success) {
        setDeleteTarget(null);
        setSuccessMessage("Record deleted successfully");
        fetchData();
        setTimeout(() => setSuccessMessage(""), 3000);
      } else {
        setError(result.error || "Delete failed");
      }
    } catch (err) {
      setError("Failed to delete record");
      console.error(err);
    } finally {
      setIsDeleting(false);
    }
  };

  const renderFormField = (column: SheetColumn) => {
    const value = formData[column.name] ?? "";

    if (column.type === "select" && lookupValues[column.name]) {
      return (
        <Select
          value={String(value)}
          onValueChange={(val) => setFormData((prev) => ({ ...prev, [column.name]: val }))}
        >
          <SelectTrigger><SelectValue placeholder={`Select ${column.name}`} /></SelectTrigger>
          <SelectContent>
            {lookupValues[column.name].map((opt) => (
              <SelectItem key={opt} value={opt}>{opt}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }

    if (column.type === "password") {
      return (
        <Input
          type="password"
          value={String(value)}
          onChange={(e) => setFormData((prev) => ({ ...prev, [column.name]: e.target.value }))}
          placeholder={column.name}
        />
      );
    }

    if (column.type === "number") {
      return (
        <Input
          type="number"
          value={String(value)}
          onChange={(e) => setFormData((prev) => ({ ...prev, [column.name]: e.target.value }))}
          placeholder={column.name}
        />
      );
    }

    if (column.type === "date") {
      return (
        <Input
          type="date"
          value={String(value)}
          onChange={(e) => setFormData((prev) => ({ ...prev, [column.name]: e.target.value }))}
        />
      );
    }

    return (
      <Input
        type="text"
        value={String(value)}
        onChange={(e) => setFormData((prev) => ({ ...prev, [column.name]: e.target.value }))}
        placeholder={column.name}
      />
    );
  };

  if (!user) {
    return <div className="min-h-screen flex items-center justify-center">Redirecting...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={() => router.push("/dashboard")}>
                <ArrowLeft className="h-4 w-4 mr-1" /> Back
              </Button>
              <h1 className="text-lg font-semibold">{sheetName}</h1>
              {schema?.hasPlantFilter && <Badge variant="outline">Plant: {user.plantId}</Badge>}
            </div>
            <Button onClick={openCreateModal} size="sm">
              <Plus className="h-4 w-4 mr-1" /> Add New
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Messages */}
        {successMessage && (
          <div className="mb-4 p-3 bg-green-50 text-green-700 rounded-md text-sm">{successMessage}</div>
        )}
        {error && (
          <div className="mb-4 p-3 bg-destructive/10 text-destructive rounded-md text-sm">{error}</div>
        )}

        {/* Search */}
        <div className="mb-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search records..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Records Table */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <p className="text-lg">No records found</p>
            <p className="text-sm mt-1">
              {searchQuery ? "Try adjusting your search" : "Click 'Add New' to create the first record"}
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-lg border shadow-sm overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {schema?.columns.map((col) => (
                    <TableHead key={col.name} className="whitespace-nowrap">
                      {col.name}
                      {col.required && <span className="text-destructive ml-0.5">*</span>}
                    </TableHead>
                  ))}
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRecords.map((record, idx) => (
                  <TableRow key={idx}>
                    {schema?.columns.map((col) => (
                      <TableCell key={col.name} className="max-w-[200px] truncate" title={String(record[col.name] ?? "")}>
                        {col.type === "password" ? "••••••" : String(record[col.name] ?? "")}
                      </TableCell>
                    ))}
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditModal(record)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteTarget(record)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        <div className="mt-4 text-sm text-muted-foreground">
          Showing {filteredRecords.length} of {records.length} records
        </div>
      </main>

      {/* Create/Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{modalMode === "create" ? "Add New" : "Edit"} {sheetName}</DialogTitle>
            <DialogDescription>Fill in the details below. Required fields are marked with *.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4">
            {schema?.columns.map((col) => (
              <div key={col.name} className="space-y-2">
                <Label htmlFor={col.name}>
                  {col.name}
                  {col.required && <span className="text-destructive ml-0.5">*</span>}
                  {col.isForeignKey && <Badge variant="outline" className="ml-2 text-xs">FK</Badge>}
                </Label>
                {renderFormField(col)}
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)} disabled={isSubmitting}>
              <X className="h-4 w-4 mr-1" /> Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Saving...</> : <><Save className="h-4 w-4 mr-1" /> Save</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Delete</DialogTitle>
            <DialogDescription>Are you sure you want to delete this record? This action cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={isDeleting}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Trash2 className="h-4 w-4 mr-1" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
