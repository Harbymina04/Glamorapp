'use client';

import { useState, useRef, useCallback } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { api } from '@/lib/api-client';
import {
  Upload, Download, CheckCircle2, XCircle, AlertCircle,
  FileSpreadsheet, Loader2, ChevronRight, RotateCcw,
} from 'lucide-react';

type Entity = 'products' | 'services' | 'customers' | 'users' | 'nail-designs';
type Step = 'upload' | 'preview' | 'result';

const ENTITIES: { key: Entity; label: string; icon: string; description: string }[] = [
  { key: 'products', label: 'Productos', icon: '📦', description: 'Inventario de productos con precios y stock' },
  { key: 'services', label: 'Servicios', icon: '✂️', description: 'Servicios del salón con precios y duración' },
  { key: 'customers', label: 'Clientes', icon: '👥', description: 'Base de datos de clientes' },
  { key: 'users', label: 'Usuarios', icon: '👤', description: 'Profesionales y staff del salón' },
  { key: 'nail-designs', label: 'Diseños de uñas', icon: '💅', description: 'Catálogo de diseños con técnicas y precios' },
];

interface PreviewRow {
  row: number;
  data: Record<string, any>;
  errors: string[];
  valid: boolean;
}

interface PreviewResult {
  total: number;
  valid: number;
  invalid: number;
  headers: string[];
  rows: PreviewRow[];
}

interface ImportResult {
  created: number;
  skipped: number;
  errors: { row: number; error: string }[];
}

export default function ImportPage() {
  const { token } = useAuthStore();
  const [entity, setEntity] = useState<Entity | null>(null);
  const [step, setStep] = useState<Step>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setStep('upload');
    setFile(null);
    setPreview(null);
    setResult(null);
    setError('');
  };

  const handleFile = useCallback(async (f: File) => {
    setFile(f);
    setError('');
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', f);
      const res = await api.postForm(`/import/preview/${entity}`, formData, { token: token! });
      setPreview(res);
      setStep('preview');
    } catch (e: any) {
      setError(e?.message || 'Error al leer el archivo');
    } finally {
      setLoading(false);
    }
  }, [entity, token]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, [handleFile]);

  const handleImport = async () => {
    if (!file || !entity) return;
    setLoading(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.postForm(`/import/${entity}`, formData, { token: token! });
      setResult(res);
      setStep('result');
    } catch (e: any) {
      setError(e?.message || 'Error al importar');
    } finally {
      setLoading(false);
    }
  };

  const downloadTemplate = async () => {
    if (!entity) return;
    const res = await fetch(`/api/v1/import/template/${entity}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `plantilla-${entity}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Importar datos</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Carga masiva desde archivos Excel (.xlsx) o CSV
        </p>
      </div>

      {/* Step 1 — Select entity */}
      {!entity ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {ENTITIES.map(e => (
            <button
              key={e.key}
              onClick={() => { setEntity(e.key); reset(); }}
              className="bg-white border border-border-primary rounded-xl p-5 text-left hover:border-glamor-primary/40 hover:shadow-md transition group"
            >
              <div className="text-3xl mb-3">{e.icon}</div>
              <h3 className="font-semibold text-foreground group-hover:text-glamor-primary transition">{e.label}</h3>
              <p className="text-xs text-muted-foreground mt-1">{e.description}</p>
              <div className="flex items-center gap-1 text-xs text-glamor-primary mt-3 opacity-0 group-hover:opacity-100 transition">
                Seleccionar <ChevronRight className="w-3 h-3" />
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {/* Header with entity selected */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{ENTITIES.find(e => e.key === entity)?.icon}</span>
              <div>
                <h2 className="font-semibold text-foreground">
                  Importar {ENTITIES.find(e => e.key === entity)?.label}
                </h2>
                <p className="text-xs text-muted-foreground">
                  {step === 'upload' ? 'Paso 1: Sube tu archivo' :
                   step === 'preview' ? 'Paso 2: Revisa los datos' :
                   'Paso 3: Resultado'}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={downloadTemplate}
                className="flex items-center gap-2 px-3 py-2 text-sm border border-border-primary rounded-lg hover:bg-surface-hover transition"
              >
                <Download className="w-4 h-4" /> Descargar plantilla
              </button>
              <button
                onClick={() => { setEntity(null); reset(); }}
                className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground border border-border-primary rounded-lg hover:bg-surface-hover transition"
              >
                Cambiar entidad
              </button>
            </div>
          </div>

          {/* Steps indicator */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {['Subir archivo', 'Vista previa', 'Resultado'].map((s, i) => {
              const stepKey = ['upload', 'preview', 'result'][i] as Step;
              const active = step === stepKey;
              const done = (step === 'preview' && i === 0) || (step === 'result' && i <= 1);
              return (
                <div key={s} className="flex items-center gap-2">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    done ? 'bg-green-500 text-white' :
                    active ? 'bg-glamor-primary text-white' :
                    'bg-gray-100 text-muted-foreground'
                  }`}>
                    {done ? '✓' : i + 1}
                  </div>
                  <span className={active ? 'text-foreground font-medium' : ''}>{s}</span>
                  {i < 2 && <ChevronRight className="w-3 h-3" />}
                </div>
              );
            })}
          </div>

          {error && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-100 text-red-700 px-4 py-3 rounded-lg text-sm">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* ── STEP 1: Upload ── */}
          {step === 'upload' && (
            <div
              onDragOver={e => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => inputRef.current?.click()}
              className={`bg-white border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition ${
                dragging ? 'border-glamor-primary bg-glamor-primary/5' : 'border-border-primary hover:border-glamor-primary/50'
              }`}
            >
              <input
                ref={inputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
              />
              {loading ? (
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="w-10 h-10 animate-spin text-glamor-primary" />
                  <p className="text-sm text-muted-foreground">Analizando archivo...</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-glamor-primary/10 flex items-center justify-center">
                    <FileSpreadsheet className="w-7 h-7 text-glamor-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Arrastra tu archivo aquí</p>
                    <p className="text-sm text-muted-foreground mt-1">o haz clic para seleccionar</p>
                    <p className="text-xs text-muted-foreground mt-2">Excel (.xlsx, .xls) o CSV — máximo 10MB</p>
                  </div>
                  <button className="flex items-center gap-2 px-4 py-2 bg-glamor-primary text-white rounded-lg text-sm font-medium hover:opacity-90 transition">
                    <Upload className="w-4 h-4" /> Seleccionar archivo
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ── STEP 2: Preview ── */}
          {step === 'preview' && preview && (
            <div className="space-y-4">
              {/* Summary */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-white border border-border-primary rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-foreground">{preview.total}</p>
                  <p className="text-xs text-muted-foreground mt-1">Total de filas</p>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-green-700">{preview.valid}</p>
                  <p className="text-xs text-green-600 mt-1">Filas válidas</p>
                </div>
                <div className={`border rounded-xl p-4 text-center ${preview.invalid > 0 ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-border-primary'}`}>
                  <p className={`text-2xl font-bold ${preview.invalid > 0 ? 'text-red-700' : 'text-muted-foreground'}`}>{preview.invalid}</p>
                  <p className={`text-xs mt-1 ${preview.invalid > 0 ? 'text-red-600' : 'text-muted-foreground'}`}>Con errores</p>
                </div>
              </div>

              {/* Table preview */}
              <div className="bg-white border border-border-primary rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border-primary bg-surface-primary">
                        <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground w-10">#</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground w-20">Estado</th>
                        {preview.headers.map(h => (
                          <th key={h} className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {preview.rows.map(row => (
                        <tr key={row.row} className={`border-b border-border-primary last:border-0 ${!row.valid ? 'bg-red-50' : ''}`}>
                          <td className="px-3 py-2 text-xs text-muted-foreground">{row.row}</td>
                          <td className="px-3 py-2">
                            {row.valid
                              ? <CheckCircle2 className="w-4 h-4 text-green-500" />
                              : (
                                <div className="flex items-start gap-1">
                                  <XCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                                  <span className="text-xs text-red-600">{row.errors.join(', ')}</span>
                                </div>
                              )
                            }
                          </td>
                          {preview.headers.map(h => (
                            <td key={h} className="px-3 py-2 text-xs text-foreground whitespace-nowrap max-w-32 truncate">
                              {String(row.data[h] ?? '')}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {preview.total > 50 && (
                  <div className="px-4 py-2 bg-surface-primary text-xs text-muted-foreground border-t border-border-primary">
                    Mostrando las primeras 50 filas de {preview.total} total.
                  </div>
                )}
              </div>

              {preview.valid === 0 && (
                <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  No hay filas válidas para importar. Revisa el archivo y vuelve a intentarlo.
                </div>
              )}

              <div className="flex gap-3 justify-end">
                <button onClick={reset} className="px-4 py-2 text-sm border border-border-primary rounded-lg hover:bg-surface-hover transition">
                  Subir otro archivo
                </button>
                <button
                  onClick={handleImport}
                  disabled={loading || preview.valid === 0}
                  className="flex items-center gap-2 px-5 py-2 bg-glamor-primary text-white text-sm font-medium rounded-lg hover:opacity-90 disabled:opacity-50 transition"
                >
                  {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Importando...</> : (
                    <><Upload className="w-4 h-4" /> Importar {preview.valid} filas válidas</>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 3: Result ── */}
          {step === 'result' && result && (
            <div className="space-y-4">
              <div className="bg-white border border-border-primary rounded-xl p-6 text-center">
                {result.created > 0 ? (
                  <CheckCircle2 className="w-14 h-14 text-green-500 mx-auto mb-3" />
                ) : (
                  <XCircle className="w-14 h-14 text-red-500 mx-auto mb-3" />
                )}
                <h3 className="text-lg font-semibold text-foreground">
                  {result.created > 0 ? '¡Importación completada!' : 'Sin registros importados'}
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {result.created} registros creados · {result.skipped} omitidos
                </p>
              </div>

              {result.errors.length > 0 && (
                <div className="bg-white border border-border-primary rounded-xl overflow-hidden">
                  <div className="px-4 py-3 border-b border-border-primary bg-red-50">
                    <p className="text-sm font-medium text-red-700">Filas con errores ({result.errors.length})</p>
                  </div>
                  <div className="divide-y divide-border-primary max-h-60 overflow-auto">
                    {result.errors.map((e, i) => (
                      <div key={i} className="flex items-start gap-3 px-4 py-2.5 text-sm">
                        <span className="text-muted-foreground shrink-0">Fila {e.row}</span>
                        <span className="text-red-600">{e.error}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => { setEntity(null); reset(); }}
                  className="px-4 py-2 text-sm border border-border-primary rounded-lg hover:bg-surface-hover transition"
                >
                  Importar otra entidad
                </button>
                <button
                  onClick={reset}
                  className="flex items-center gap-2 px-4 py-2 text-sm bg-glamor-primary text-white rounded-lg hover:opacity-90 transition"
                >
                  <RotateCcw className="w-4 h-4" /> Importar más {ENTITIES.find(e => e.key === entity)?.label}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
