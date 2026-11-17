import React, { useState, useEffect } from "react";
import { useApp } from "../AppContext";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Button } from "../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../components/ui/tabs";
import { Label } from "../components/ui/label";
import { Upload, FileText, Trash2 } from "lucide-react";
import { documentosEntregaAPI } from "../api"; 

export function EquipmentDataPage() {
  const { currentUser, users } = useApp();
  const [documentos, setDocumentos] = useState<any[]>([]);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  const [activeTab, setActiveTab] = useState("Equipamentos");
  const [destinatario, setDestinatario] = useState("");
  const [categoria, setCategoria] = useState("Equipamentos");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  useEffect(() => {
    loadDocumentos();
  }, []);

  const loadDocumentos = async () => {
    try {
      const data = await documentosEntregaAPI.getAll();
      setDocumentos(data);
    } catch (error) {
      console.error("Erro ao carregar documentos:", error);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      if (file.type !== "application/pdf") {
        alert("Por favor, selecione apenas ficheiros PDF.");
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || !destinatario || !currentUser?.id) {
      alert("Preencha todos os campos. (Verifique se tem sessão iniciada)");
      return;
    }

    try {
      setIsUploading(true);
      await documentosEntregaAPI.upload(selectedFile, destinatario, currentUser.id, categoria);
      
      setDestinatario("");
      setCategoria("Equipamentos");
      setSelectedFile(null);
      setIsUploadModalOpen(false);
      await loadDocumentos();
      
    } catch (error: any) {
      alert("Erro ao fazer upload: " + error.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (id: string, url: string) => {
    if (confirm("Tem a certeza que deseja eliminar este documento permanentemente?")) {
      try {
        await documentosEntregaAPI.delete(id, url);
        await loadDocumentos();
      } catch (error: any) {
        alert("Erro ao eliminar: " + error.message);
      }
    }
  };

  // Filtra os documentos dependendo da aba ativa
  const filteredDocumentos = documentos.filter(doc => 
    (doc.categoria || "Equipamentos") === activeTab
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Documentação</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Gestão de ficheiros e autos de entrega
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex justify-between items-center mb-4">
          <TabsList>
            <TabsTrigger value="Equipamentos">Equipamentos</TabsTrigger>
            <TabsTrigger value="Cintas e Estropos">Cintas e Estropos</TabsTrigger>
          </TabsList>
          <Button onClick={() => {
            setCategoria(activeTab); // Pré-seleciona a categoria dependendo da aba
            setIsUploadModalOpen(true);
          }} className="bg-red-600 hover:bg-red-600">
            <Upload className="w-4 h-4 mr-2" />
            Novo Ficheiro
          </Button>
        </div>

        <TabsContent value={activeTab}>
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto border-t rounded-b-lg dark:border-gray-700">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th className="p-3 text-left font-semibold border-b dark:border-gray-700">Nome do Ficheiro</th>
                      <th className="p-3 text-left font-semibold border-b dark:border-gray-700">Entregue A</th>
                      <th className="p-3 text-left font-semibold border-b dark:border-gray-700">Data</th>
                      <th className="p-3 text-center font-semibold border-b dark:border-gray-700 w-24">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDocumentos.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="text-center py-8 text-gray-500">
                          Nenhum documento de {activeTab.toLowerCase()} registado.
                        </td>
                      </tr>
                    ) : (
                      filteredDocumentos.map((doc) => (
                        <tr 
                          key={doc.id} 
                          // ✅ Abre o PDF ao clicar na linha inteira
                          onClick={() => window.open(doc.url_ficheiro, "_blank")}
                          // ✅ Cursor pointer indica que a linha é clicável
                          className="border-b dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800/80 transition-colors cursor-pointer"
                        >
                          <td className="p-3 font-medium flex items-center gap-2">
                            <FileText className="w-4 h-4 text-red-500 flex-shrink-0" />
                            <span className="truncate max-w-[300px]" title={doc.nome_ficheiro}>
                              {doc.nome_ficheiro}
                            </span>
                          </td>
                          <td className="p-3 font-medium">{doc.destinatario}</td>
                          <td className="p-3 text-gray-600 dark:text-gray-400">
                            {new Date(doc.data_criacao).toLocaleDateString('pt-PT')}
                          </td>
                          <td className="p-3">
                            <div className="flex justify-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  // ✅ Impede que a linha abra o PDF quando se clica no botão de apagar
                                  e.stopPropagation(); 
                                  handleDelete(doc.id, doc.url_ficheiro);
                                }}
                                title="Eliminar"
                                className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 border-red-200 dark:border-red-800/30"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modal de Upload de PDF */}
      <Dialog open={isUploadModalOpen} onOpenChange={setIsUploadModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Submeter Novo Documento</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUploadSubmit} className="space-y-4 mt-2">
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="categoria">Categoria *</Label>
                <select
                  id="categoria"
                  value={categoria}
                  onChange={(e) => setCategoria(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md text-sm dark:bg-gray-800 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-red-500"
                  required
                >
                  <option value="Equipamentos">Equipamentos</option>
                  <option value="Cintas e Estropos">Cintas e Estropos</option>
                </select>
              </div>

              <div>
                <Label htmlFor="destinatario">Utilizador *</Label>
                <select
                  id="destinatario"
                  value={destinatario}
                  onChange={(e) => setDestinatario(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md text-sm dark:bg-gray-800 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-red-500"
                  required
                >
                  <option value="">Selecione o destinatário...</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.nome}>
                      {user.nome}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            <div>
              <Label>Ficheiro (Apenas PDF) *</Label>
              <div className="mt-1 border-2 border-dashed border-gray-300 dark:border-gray-700 p-6 rounded-lg text-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                 <Label htmlFor="file-upload" className="cursor-pointer block w-full h-full">
                    <Upload className={`mx-auto mb-2 w-8 h-8 ${selectedFile ? 'text-red-500' : 'text-gray-400'}`} />
                    <span className="text-sm font-medium">
                      {selectedFile ? (
                        <span className="text-red-600 dark:text-red-400 font-semibold">{selectedFile.name}</span>
                      ) : (
                        "Clique para selecionar o PDF"
                      )}
                    </span>
                    <input
                      id="file-upload"
                      type="file"
                      accept="application/pdf"
                      className="hidden"
                      onChange={handleFileChange}
                      required
                    />
                 </Label>
              </div>
            </div>

            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => setIsUploadModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-red-600 hover:bg-red-600" disabled={isUploading || !selectedFile}>
                {isUploading ? "A carregar..." : "Submeter Documento"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}