import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  listExportedCsvFiles,
  readExportedCsvFile,
  renameExportedCsvFile,
  type ExportedCsvFile,
} from '@/lib/product-export';

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
  const [renameModalOpen, setRenameModalOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const [renameTarget, setRenameTarget] = useState<ExportedCsvFile | null>(null);

  const loadPreviewForUri = useCallback(async (fileUri: string) => {
    setPreviewLoading(true);

    try {
      setPreview(await readExportedCsvFile(fileUri));
    } finally {
      setPreviewLoading(false);
    }
  }, []);

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
      await loadPreviewForUri(nextSelectedUri);
    } finally {
      setLoading(false);
    }
  }, [loadPreviewForUri, selectedFileUri]);

  useFocusEffect(
    useCallback(() => {
      loadFiles();
    }, [loadFiles])
  );

  const handleSelectFile = useCallback(
    async (file: ExportedCsvFile) => {
      setSelectedFileUri(file.fileUri);
      await loadPreviewForUri(file.fileUri);
    },
    [loadPreviewForUri]
  );

  const handleOpenRename = useCallback((file: ExportedCsvFile) => {
    setRenameTarget(file);
    setRenameValue(file.fileName.replace(/\.csv$/i, ''));
    setRenameModalOpen(true);
  }, []);

  const handleRename = useCallback(async () => {
    if (!renameTarget || renaming) {
      return;
    }

    setRenaming(true);

    try {
      const renamedFile = await renameExportedCsvFile(renameTarget.fileUri, renameValue);
      const nextFiles = await listExportedCsvFiles();

      setFiles(nextFiles);
      setSelectedFileUri(renamedFile.fileUri);
      setRenameModalOpen(false);
      setRenameTarget(null);
      await loadPreviewForUri(renamedFile.fileUri);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to rename CSV.';
      Alert.alert('Rename failed', message);
    } finally {
      setRenaming(false);
    }
  }, [loadPreviewForUri, renameTarget, renameValue, renaming]);

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
  const previewHeight = useMemo(() => {
    const headerHeight = 52;
    const rowHeight = 72;
    const minimumHeight = 140;
    const maximumHeight = 420;

    return Math.min(maximumHeight, Math.max(minimumHeight, headerHeight + previewBody.length * rowHeight));
  }, [previewBody.length]);

  const visiblePreviewColumns = useMemo(() => {
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
  }, [previewHeader]);

  return (
    <SafeAreaView className="flex-1 bg-surface">
      <View className="flex-1 px-5 pb-5 pt-4">
        <View className="rounded-[28px] border border-[#F3D8BF] bg-white px-4 py-4">
          <Text className="mb-2 text-xs font-semibold uppercase tracking-[1.5px] text-slate">Sort by</Text>
          <Pressable
            className="rounded-[22px] border border-[#F3D8BF] bg-surface px-4 py-3"
            onPress={() => setSortMenuOpen((current) => !current)}>
            <Text className="text-base font-semibold text-charcoal">{selectedSortLabel}</Text>
          </Pressable>
          {sortMenuOpen ? (
            <View className="mt-2 overflow-hidden rounded-[22px] border border-[#F3D8BF] bg-surface">
              {SORT_OPTIONS.map((option, index) => {
                const selected = option.key === sortBy;

                return (
                  <Pressable
                    key={option.key}
                    className={`px-4 py-3 ${index < SORT_OPTIONS.length - 1 ? 'border-b border-[#F3D8BF]' : ''}`}
                    onPress={() => {
                      setSortBy(option.key);
                      setSortMenuOpen(false);
                    }}>
                    <Text className={selected ? 'font-semibold text-tomato' : 'text-charcoal'}>
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ) : null}
        </View>

        {loading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator color="#F05A28" />
          </View>
        ) : (
          <FlatList
            className="mt-4 flex-1"
            data={sortedFiles}
            keyExtractor={(item) => item.fileUri}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 24, flexGrow: sortedFiles.length ? 0 : 1 }}
            ListHeaderComponent={
              <View className="mb-5 overflow-hidden rounded-[30px] bg-charcoal px-5 pb-5 pt-5">
                <View className="absolute right-0 top-0 h-28 w-28 rounded-full bg-tomato/20" />
                <Text className="text-xs font-semibold uppercase tracking-[2px] text-peach">CSV lounge</Text>
                <Text className="mt-2 text-3xl font-bold text-white">Exports, dressed like dashboard.</Text>
                <Text className="mt-3 text-sm leading-6 text-[#FDE7D3]">
                  Saved inside app storage. Tap file to preview. Long press file to rename.
                </Text>
              </View>
            }
            renderItem={({ item }) => {
              const selected = item.fileUri === selectedFileUri;

              return (
                <Pressable
                  className={`mb-3 rounded-[28px] border px-4 py-4 ${selected ? 'border-tomato bg-white' : 'border-[#F3D8BF] bg-white'}`}
                  onLongPress={() => handleOpenRename(item)}
                  onPress={() => handleSelectFile(item)}>
                  <Text className="text-base font-semibold text-charcoal">{item.fileName}</Text>
                  <Text className="mt-1 text-sm text-slate">
                    {formatModifiedAt(item.modifiedAt)} · {formatFileSize(item.size)}
                  </Text>
                  <Text className="mt-2 text-xs text-slate">{item.fileUri}</Text>
                </Pressable>
              );
            }}
            ListEmptyComponent={
              <View className="flex-1 items-center justify-center rounded-[30px] border border-dashed border-[#F3D8BF] bg-white px-8 py-12">
                <Text className="text-lg font-semibold text-charcoal">No CSV exports yet</Text>
                <Text className="mt-2 text-center text-sm text-slate">
                  Export from inventory screen. Files show here after save.
                </Text>
              </View>
            }
            ListFooterComponent={
              selectedFileUri ? (
                <View
                  className="mt-4 overflow-hidden rounded-[30px] border border-[#F3D8BF] bg-white"
                  style={{ height: previewHeight }}>
                  <View className="border-b border-[#F3D8BF] px-4 py-3">
                    <Text className="text-sm font-semibold uppercase tracking-[1.5px] text-charcoal">Preview</Text>
                  </View>
                  {previewLoading ? (
                    <View className="flex-1 items-center justify-center">
                      <ActivityIndicator color="#F05A28" />
                    </View>
                  ) : (
                    <ScrollView horizontal>
                      <View className="min-w-full p-4">
                        {previewHeader.length ? (
                          <>
                            <View className="flex-row border-b border-[#F3D8BF] bg-surface">
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
                                className={`flex-row border-b border-[#F3D8BF] ${rowIndex % 2 === 0 ? 'bg-white' : 'bg-surface'}`}>
                                {visiblePreviewColumns.map((columnIndex) => (
                                  <View key={`cell-${rowIndex}-${columnIndex}`} className="min-w-32 flex-1 px-3 py-3">
                                    {previewHeader[columnIndex] === 'imageUri' && row[columnIndex] ? (
                                      <Image
                                        className="h-14 w-14 rounded-xl bg-canvas"
                                        resizeMode="cover"
                                        source={{ uri: row[columnIndex] }}
                                      />
                                    ) : (
                                      <Text className="text-xs leading-5 text-charcoal">{row[columnIndex] ?? ''}</Text>
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
              ) : null
            }
          />
        )}
      </View>

      <Modal animationType="fade" transparent visible={renameModalOpen}>
        <View className="flex-1 items-center justify-center bg-black/35 px-6">
          <View className="w-full rounded-[28px] bg-white p-5">
            <Text className="text-lg font-semibold text-charcoal">Rename CSV</Text>
            <Text className="mt-2 text-sm leading-6 text-slate">Long file names fine. `.csv` kept automatically.</Text>
            <TextInput
              autoFocus
              className="mt-4 rounded-[22px] border border-[#F3D8BF] bg-surface px-4 py-3 text-base text-charcoal"
              onChangeText={setRenameValue}
              placeholder="May-sales"
              placeholderTextColor="#64748B"
              value={renameValue}
            />
            <View className="mt-4 flex-row justify-end">
              <Pressable
                className="mr-3 rounded-[20px] border border-[#F3D8BF] px-4 py-3"
                onPress={() => {
                  if (renaming) {
                    return;
                  }

                  setRenameModalOpen(false);
                  setRenameTarget(null);
                }}>
                <Text className="font-semibold text-charcoal">Cancel</Text>
              </Pressable>
              <Pressable className="rounded-[20px] bg-tomato px-4 py-3" onPress={handleRename}>
                <Text className="font-semibold text-white">{renaming ? 'Renaming...' : 'Rename'}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
