"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DocumentUpload } from "@/components/documents/document-upload";
import { FileText, Download, Trash2, Calendar, Filter, Sparkles } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Document {
  id: string;
  file_name: string;
  file_size: number;
  file_type: string;
  storage_path: string;
  category: string;
  uploaded_at: string;
  ai_summary?: string | null;
}

export default function DocumentsPage() {
  const supabase = createClient();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    fetchDocuments();
  }, [filter]);

  async function fetchDocuments() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      let query = supabase
        .from("medical_documents")
        .select("*")
        .eq("user_id", user.id)
        .order("uploaded_at", { ascending: false });

      if (filter !== "all") {
        query = query.eq("category", filter);
      }

      const { data, error } = await query;

      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      console.error("Error fetching documents:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleDownload(doc: Document) {
    try {
      const { data, error } = await supabase.storage
        .from("medical-documents")
        .download(doc.storage_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = doc.file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Download error:", error);
      alert("Erro ao baixar arquivo");
    }
  }

  async function handleDelete(doc: Document) {
    if (!confirm("Tem certeza que deseja deletar este documento?")) return;

    try {
      // Deletar do storage
      const { error: storageError } = await supabase.storage
        .from("medical-documents")
        .remove([doc.storage_path]);

      if (storageError) throw storageError;

      // Deletar do banco
      const { error: dbError } = await supabase
        .from("medical_documents")
        .delete()
        .eq("id", doc.id);

      if (dbError) throw dbError;

      fetchDocuments();
    } catch (error) {
      console.error("Delete error:", error);
      alert("Erro ao deletar documento");
    }
  }

  const categoryColors = {
    exam: "bg-blue-100 text-blue-700",
    prescription: "bg-green-100 text-green-700",
    report: "bg-purple-100 text-purple-700",
    other: "bg-gray-100 text-gray-700",
  };

  const categoryLabels = {
    exam: "Exame",
    prescription: "Receita",
    report: "Laudo",
    other: "Outro",
  };

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">Meus Documentos</h1>
        <p className="text-gray-500">Gerencie seus documentos médicos</p>
      </div>

      {/* Upload */}
      <DocumentUpload onUploadComplete={fetchDocuments} />

      {/* Filtros */}
      <div className="flex items-center gap-3">
        <Filter className="w-5 h-5 text-gray-400" />
        <div className="flex gap-2">
          {["all", "exam", "prescription", "report", "other"].map((cat) => (
            <Button
              key={cat}
              variant={filter === cat ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(cat)}
            >
              {cat === "all"
                ? "Todos"
                : categoryLabels[cat as keyof typeof categoryLabels]}
            </Button>
          ))}
        </div>
      </div>

      {/* Lista de Documentos */}
      <Card>
        <CardHeader>
          <CardTitle>Documentos ({documents.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12">
              <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-gray-500">Carregando documentos...</p>
            </div>
          ) : documents.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Nenhum documento encontrado</p>
            </div>
          ) : (
            <div className="space-y-3">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center gap-4 p-4 border border-gray-200 rounded-lg hover:border-primary-300 transition"
                >
                  <FileText className="w-10 h-10 text-gray-400" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{doc.file_name}</p>
                    <div className="flex items-center gap-3 text-sm text-gray-500 mt-1">
                      <span>{(doc.file_size / 1024).toFixed(1)} KB</span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {format(new Date(doc.uploaded_at), "dd/MM/yyyy", {
                          locale: ptBR,
                        })}
                      </span>
                      {doc.ai_summary && (
                        <>
                          <span>•</span>
                          <span className="flex items-center gap-1 text-primary-600">
                            <Sparkles className="w-3 h-3" />
                            Resumo disponível
                          </span>
                        </>
                      )}
                    </div>
                    {doc.ai_summary && (
                      <div className="mt-2 p-2 bg-blue-50 rounded text-xs text-gray-700">
                        {(() => {
                          try {
                            const summary = JSON.parse(doc.ai_summary);
                            return summary.resumo_executivo || "Resumo gerado por IA";
                          } catch {
                            return doc.ai_summary;
                          }
                        })()}
                      </div>
                    )}
                  </div>
                  <Badge
                    className={
                      categoryColors[
                        doc.category as keyof typeof categoryColors
                      ]
                    }
                  >
                    {
                      categoryLabels[
                        doc.category as keyof typeof categoryLabels
                      ]
                    }
                  </Badge>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownload(doc)}
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(doc)}
                    >
                      <Trash2 className="w-4 h-4" />
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
