import { useTranslation } from "react-i18next";
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  FileText,
  Upload,
  Search,
  FolderOpen,
  Download,
  Trash2,
  History,
  FileImage,
  FileSpreadsheet,
  File,
  Building2,
} from "lucide-react";
import type { Site, SiteDocument } from "@shared/schema";
import { useAuth } from "@/hooks/useAuth";

const DOCUMENT_CATEGORIES = [
  "plans",
  "certificates",
  "reports",
  "contracts",
  "safety",
] as const;

type DocumentCategory = typeof DOCUMENT_CATEGORIES[number];

export default function Documents() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { user, isManager } = useAuth();
  const [search, setSearch] = useState("");
  const [selectedSite, setSelectedSite] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [showVersionsDialog, setShowVersionsDialog] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<SiteDocument | null>(null);
  const [uploadForm, setUploadForm] = useState({
    siteId: "",
    name: "",
    category: "plans" as DocumentCategory,
    description: "",
    fileUrl: "",
    fileType: "",
    fileSize: 0,
  });

  const { data: sites, isLoading: sitesLoading } = useQuery<Site[]>({
    queryKey: ["/api/sites"],
  });

  const { data: documents, isLoading: documentsLoading } = useQuery<SiteDocument[]>({
    queryKey: ["/api/sites", selectedSite, "documents"],
    queryFn: async () => {
      if (selectedSite === "all") {
        const allDocs: SiteDocument[] = [];
        if (sites) {
          for (const site of sites) {
            const response = await fetch(`/api/sites/${site.id}/documents`, {
              credentials: "include",
            });
            if (response.ok) {
              const siteDocs = await response.json();
              allDocs.push(...siteDocs);
            }
          }
        }
        return allDocs;
      }
      const response = await fetch(`/api/sites/${selectedSite}/documents`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch documents");
      return response.json();
    },
    enabled: !!sites && sites.length > 0,
  });

  const { data: versions, isLoading: versionsLoading } = useQuery<SiteDocument[]>({
    queryKey: ["/api/documents", selectedDocument?.id, "versions"],
    queryFn: async () => {
      if (!selectedDocument) return [];
      const response = await fetch(`/api/documents/${selectedDocument.id}/versions`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch versions");
      return response.json();
    },
    enabled: !!selectedDocument && showVersionsDialog,
  });

  const uploadMutation = useMutation({
    mutationFn: async (data: typeof uploadForm) => {
      return apiRequest("POST", `/api/sites/${data.siteId}/documents`, {
        ...data,
        uploadedBy: user?.id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sites"] });
      toast({ title: t("documents.uploadSuccess") });
      setShowUploadDialog(false);
      resetUploadForm();
    },
    onError: () => {
      toast({ title: t("documents.uploadError"), variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/documents/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sites"] });
      toast({ title: t("documents.deleteSuccess") });
    },
    onError: () => {
      toast({ title: t("documents.deleteError"), variant: "destructive" });
    },
  });

  const resetUploadForm = () => {
    setUploadForm({
      siteId: "",
      name: "",
      category: "plans",
      description: "",
      fileUrl: "",
      fileType: "",
      fileSize: 0,
    });
  };

  const filteredDocuments = documents?.filter((doc) => {
    const matchesSearch = doc.name.toLowerCase().includes(search.toLowerCase()) ||
      doc.description?.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = selectedCategory === "all" || doc.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const getCategoryBadge = (category: string) => {
    const colors: Record<string, "default" | "secondary" | "outline"> = {
      plans: "default",
      certificates: "secondary",
      reports: "outline",
      contracts: "secondary",
      safety: "default",
    };
    return <Badge variant={colors[category] || "secondary"}>{t(`documents.categories.${category}`)}</Badge>;
  };

  const getFileIcon = (fileType: string | null) => {
    if (!fileType) return <File className="h-8 w-8 text-muted-foreground" />;
    if (fileType.includes("image")) return <FileImage className="h-8 w-8 text-blue-500" />;
    if (fileType.includes("spreadsheet") || fileType.includes("excel")) return <FileSpreadsheet className="h-8 w-8 text-green-500" />;
    if (fileType.includes("pdf")) return <FileText className="h-8 w-8 text-red-500" />;
    return <File className="h-8 w-8 text-muted-foreground" />;
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  const getSiteName = (siteId: string) => {
    return sites?.find((s) => s.id === siteId)?.name || siteId;
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadForm({
        ...uploadForm,
        name: file.name,
        fileType: file.type,
        fileSize: file.size,
        fileUrl: URL.createObjectURL(file),
      });
    }
  };

  const isLoading = sitesLoading || documentsLoading;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">{t("documents.title")}</h1>
          <p className="text-muted-foreground">{t("documents.subtitle")}</p>
        </div>
        {isManager && (
          <Button onClick={() => setShowUploadDialog(true)} data-testid="button-upload-document">
            <Upload className="mr-2 h-4 w-4" />
            {t("documents.upload")}
          </Button>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("common.search")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            data-testid="input-search-documents"
          />
        </div>
        <Select value={selectedSite} onValueChange={setSelectedSite}>
          <SelectTrigger className="w-full sm:w-48" data-testid="select-site-filter">
            <SelectValue placeholder={t("documents.selectSite")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("documents.allSites")}</SelectItem>
            {sites?.map((site) => (
              <SelectItem key={site.id} value={site.id}>{site.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-full sm:w-48" data-testid="select-category-filter">
            <SelectValue placeholder={t("documents.category")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("documents.allCategories")}</SelectItem>
            {DOCUMENT_CATEGORIES.map((cat) => (
              <SelectItem key={cat} value={cat}>{t(`documents.categories.${cat}`)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-8 w-8 mb-4" />
                <Skeleton className="h-5 w-3/4 mb-2" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredDocuments?.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <FolderOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">{t("documents.noDocuments")}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDocuments?.map((doc) => (
            <Card key={doc.id} className="hover-elevate" data-testid={`card-document-${doc.id}`}>
              <CardHeader className="pb-2">
                <div className="flex items-start gap-3">
                  {getFileIcon(doc.fileType)}
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base truncate">{doc.name}</CardTitle>
                    <CardDescription className="flex items-center gap-1 text-xs">
                      <Building2 className="h-3 w-3" />
                      {getSiteName(doc.siteId)}
                    </CardDescription>
                  </div>
                  {getCategoryBadge(doc.category)}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {doc.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">{doc.description}</p>
                )}
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{formatFileSize(doc.fileSize)}</span>
                  <span>v{doc.version}</span>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => window.open(doc.fileUrl, "_blank")}
                    data-testid={`button-download-${doc.id}`}
                  >
                    <Download className="h-3 w-3 mr-1" />
                    {t("documents.download")}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setSelectedDocument(doc);
                      setShowVersionsDialog(true);
                    }}
                    data-testid={`button-versions-${doc.id}`}
                  >
                    <History className="h-3 w-3 mr-1" />
                    {t("documents.versions")}
                  </Button>
                  {isManager && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => deleteMutation.mutate(doc.id)}
                      data-testid={`button-delete-${doc.id}`}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("documents.uploadDocument")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t("documents.selectSite")}</Label>
              <Select
                value={uploadForm.siteId}
                onValueChange={(v) => setUploadForm({ ...uploadForm, siteId: v })}
              >
                <SelectTrigger data-testid="select-upload-site">
                  <SelectValue placeholder={t("documents.selectSite")} />
                </SelectTrigger>
                <SelectContent>
                  {sites?.map((site) => (
                    <SelectItem key={site.id} value={site.id}>{site.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t("documents.category")}</Label>
              <Select
                value={uploadForm.category}
                onValueChange={(v) => setUploadForm({ ...uploadForm, category: v as DocumentCategory })}
              >
                <SelectTrigger data-testid="select-upload-category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DOCUMENT_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>{t(`documents.categories.${cat}`)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t("documents.file")}</Label>
              <Input
                type="file"
                onChange={handleFileSelect}
                data-testid="input-file-upload"
              />
              {uploadForm.name && (
                <p className="text-sm text-muted-foreground">
                  {uploadForm.name} ({formatFileSize(uploadForm.fileSize)})
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>{t("documents.description")}</Label>
              <Textarea
                value={uploadForm.description}
                onChange={(e) => setUploadForm({ ...uploadForm, description: e.target.value })}
                placeholder={t("documents.descriptionPlaceholder")}
                data-testid="input-description"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUploadDialog(false)}>
              {t("common.cancel")}
            </Button>
            <Button
              onClick={() => uploadMutation.mutate(uploadForm)}
              disabled={!uploadForm.siteId || !uploadForm.name || uploadMutation.isPending}
              data-testid="button-confirm-upload"
            >
              {uploadMutation.isPending ? t("common.loading") : t("documents.upload")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showVersionsDialog} onOpenChange={setShowVersionsDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("documents.versionHistory")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {selectedDocument && (
              <div className="flex items-center gap-3 p-3 bg-muted rounded-md">
                {getFileIcon(selectedDocument.fileType)}
                <div>
                  <p className="font-medium">{selectedDocument.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {t("documents.currentVersion")}: v{selectedDocument.version}
                  </p>
                </div>
              </div>
            )}
            {versionsLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : versions?.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">
                {t("documents.noVersions")}
              </p>
            ) : (
              <div className="space-y-2">
                {versions?.map((ver) => (
                  <div key={ver.id} className="flex items-center justify-between p-3 border rounded-md">
                    <div>
                      <p className="text-sm font-medium">v{ver.version}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(ver.createdAt!).toLocaleDateString()}
                      </p>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => window.open(ver.fileUrl, "_blank")}>
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
