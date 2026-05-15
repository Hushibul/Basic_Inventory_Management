import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Pressable, ScrollView, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { listExportedCsvFiles, readExportedCsvFile, type ExportedCsvFile } from '@/lib/product-export';

const SORT_OPTIONS = [
  { key: 'last_modified', label: 'Last modified' },
  { key: 'name_asc', label: 'Name A-Z' },
  { key: 'name_desc', label: 'Name Z-A' },
] as const;

type SortOption = (typeof SORT_OPTIONS)[number]['key'];
const HIDDEN_PREVIEW_COLUMNS = new Set(['id', 'createdAt', 'updatedAt']);

function parseCsvLine(line: string) {
  const values: string[] = [];
  let currentValue = '';
  let insideQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const nextChar = line[index + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        currentValue += '"';
        index += 1;
      } else {
        insideQuotes = !insideQuotes;
      }

      continue;
    }

    if (char === ',' && !insideQuotes) {
      values.push(currentValue);
      currentValue = '';
      continue;
    }

    currentValue += char;
  }

  values.push(currentValue);
  return values;
}

function parseCsvTable(csvContent: string) {
  return csvContent
    .split(/\r?\n/)
    .filter((line) => line.length > 0)
    .map(parseCsvLine);
}

function formatFileSize(size: number) {
  if (size < 1024) {
    return `${size} B`;
  }

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }

  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function formatModifiedAt(value: number | null) {
  if (!value) {
    return 'Unknown date';
  }

  return new Date(value).toLocaleString();
}

export default function ExportsScreen() {
  const [files, setFiles] = useState<ExportedCsvFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFileUri, setSelectedFileUri] = useState<string | null>(null);
  const [preview, setPreview] = useState('');
  const [previewLoading, setPreviewLoading] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('last_modified');
  const [sortMenuOpen, setSortMenuOpen] = useState(false);

  const loadFiles = useCallback(async () => {
    setLoading(true);

    try {
      const nextFiles = await listExportedCsvFiles();
      setFiles(nextFiles);

      if (!nextFiles.length) {
        setSelectedFileUri(null);
        setPreview('');
        return;
      }

      const nextSelectedUri = nextFiles.some((file) => file.fileUri === selectedFileUri)
        ? selectedFileUri
        : nextFiles[0].fileUri;

      if (!nextSelectedUri) {
        return;
      }

      setSelectedFileUri(nextSelectedUri);
      setPreviewLoading(true);

      try {
        setPreview(await readExportedCsvFile(nextSelectedUri));
      } finally {
        setPreviewLoading(false);
      }
    } finally {
      setLoading(false);
    }
  }, [selectedFileUri]);

  useFocusEffect(
    useCallback(() => {
      loadFiles();
    }, [loadFiles])
  );

  const handleSelectFile = useCallback(async (file: ExportedCsvFile) => {
    setSelectedFileUri(file.fileUri);
    setPreviewLoading(true);

    try {
      setPreview(await readExportedCsvFile(file.fileUri));
    } finally {
      setPreviewLoading(false);
    }
  }, []);

  const sortedFiles = useMemo(() => {
    const nextFiles = [...files];

    nextFiles.sort((left, right) => {
      if (sortBy === 'name_asc') {
        return left.fileName.localeCompare(right.fileName, undefined, { sensitivity: 'base' });
      }

      if (sortBy === 'name_desc') {
        return right.fileName.localeCompare(left.fileName, undefined, { sensitivity: 'base' });
      }

      return (right.modifiedAt ?? 0) - (left.modifiedAt ?? 0);
    });

    return nextFiles;
  }, [files, sortBy]);

  const selectedSortLabel = useMemo(
    () => SORT_OPTIONS.find((option) => option.key === sortBy)?.label ?? 'Last modified',
    [sortBy]
  );

  const previewRows = useMemo(() => parseCsvTable(preview), [preview]);
  const previewHeader = previewRows[0] ?? [];
  const previewBody = previewRows.slice(1);
  const visiblePreviewColumns = useMemo(
    () => {
      const indexes = previewHeader.reduce<number[]>((result, columnName, index) => {
        if (!HIDDEN_PREVIEW_COLUMNS.has(columnName)) {
          result.push(index);
        }

        return result;
      }, []);

      const imageColumnIndex = previewHeader.indexOf('imageUri');
      if (imageColumnIndex > -1) {
        return [imageColumnIndex, ...indexes.filter((index) => index !== imageColumnIndex)];
      }

      return indexes;
    },
    [previewHeader]
  );

  return (
    <SafeAreaView className="flex-1 bg-canvas">
      <View className="flex-1 px-5 pb-5 pt-4">
        <Text className="text-sm text-slate">Saved inside app storage. Open any file below to verify CSV content.</Text>

        {loading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator color="#0F766E" />
          </View>
        ) : (
          <>
            <View className="mt-4">
              <Text className="mb-2 text-sm font-medium text-slate">Sort by</Text>
              <Pressable
                className="rounded-2xl border border-mist bg-white px-4 py-3"
                onPress={() => setSortMenuOpen((current) => !current)}>
                <Text className="text-base text-ink">{selectedSortLabel}</Text>
              </Pressable>
              {sortMenuOpen ? (
                <View className="mt-2 overflow-hidden rounded-2xl border border-mist bg-white">
                  {SORT_OPTIONS.map((option, index) => {
                    const selected = option.key === sortBy;

                    return (
                      <Pressable
                        key={option.key}
                        className={`px-4 py-3 ${index < SORT_OPTIONS.length - 1 ? 'border-b border-mist' : ''}`}
                        onPress={() => {
                          setSortBy(option.key);
                          setSortMenuOpen(false);
                        }}>
                        <Text className={selected ? 'font-semibold text-brand' : 'text-ink'}>
                          {option.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              ) : null}
            </View>

            <FlatList
              className="mt-4 max-h-72"
              data={sortedFiles}
              keyExtractor={(item) => item.fileUri}
              contentContainerStyle={{ flexGrow: sortedFiles.length ? 0 : 1 }}
              renderItem={({ item }) => {
                const selected = item.fileUri === selectedFileUri;

                return (
                  <Pressable
                    className={`mb-3 rounded-3xl border px-4 py-4 ${selected ? 'border-brand bg-white' : 'border-mist bg-white'}`}
                    onPress={() => handleSelectFile(item)}>
                    <Text className="text-base font-semibold text-ink">{item.fileName}</Text>
                    <Text className="mt-1 text-sm text-slate">
                      {formatModifiedAt(item.modifiedAt)} · {formatFileSize(item.size)}
                    </Text>
                    <Text className="mt-2 text-xs text-slate">{item.fileUri}</Text>
                  </Pressable>
                );
              }}
              ListEmptyComponent={
                <View className="flex-1 items-center justify-center rounded-3xl border border-dashed border-mist bg-white px-8 py-12">
                  <Text className="text-lg font-semibold text-ink">No CSV exports yet</Text>
                  <Text className="mt-2 text-center text-sm text-slate">
                    Export from inventory screen. Files show here after save.
                  </Text>
                </View>
              }
            />

            {selectedFileUri ? (
              <View className="mt-4 flex-1 overflow-hidden rounded-3xl border border-mist bg-white">
                <View className="border-b border-mist px-4 py-3">
                  <Text className="text-sm font-semibold text-ink">Preview</Text>
                </View>
                {previewLoading ? (
                  <View className="flex-1 items-center justify-center">
                    <ActivityIndicator color="#0F766E" />
                  </View>
                ) : (
                  <ScrollView horizontal>
                    <View className="min-w-full p-4">
                      {previewHeader.length ? (
                        <>
                          <View className="flex-row border-b border-mist bg-canvas">
                            {visiblePreviewColumns.map((columnIndex) => (
                              <View key={`${previewHeader[columnIndex]}-${columnIndex}`} className="min-w-32 flex-1 px-3 py-3">
                                <Text className="text-xs font-semibold uppercase tracking-wide text-slate">
                                  {previewHeader[columnIndex]}
                                </Text>
                              </View>
                            ))}
                          </View>
                          {previewBody.map((row, rowIndex) => (
                            <View
                              key={`row-${rowIndex}`}
                              className={`flex-row border-b border-mist ${rowIndex % 2 === 0 ? 'bg-white' : 'bg-canvas'}`}>
                              {visiblePreviewColumns.map((columnIndex) => (
                                <View key={`cell-${rowIndex}-${columnIndex}`} className="min-w-32 flex-1 px-3 py-3">
                                  {previewHeader[columnIndex] === 'imageUri' && row[columnIndex] ? (
                                    <Image
                                      className="h-14 w-14 rounded-xl bg-canvas"
                                      resizeMode="cover"
                                      source={{ uri: row[columnIndex] }}
                                    />
                                  ) : (
                                    <Text className="text-xs leading-5 text-ink">{row[columnIndex] ?? ''}</Text>
                                  )}
                                </View>
                              ))}
                            </View>
                          ))}
                        </>
                      ) : (
                        <Text className="text-sm text-slate">No preview available.</Text>
                      )}
                    </View>
                  </ScrollView>
                )}
              </View>
            ) : null}
          </>
        )}
      </View>
    </SafeAreaView>
  );
}
