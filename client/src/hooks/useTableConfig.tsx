import {
  PropsWithChildren,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export type TableConfig = {
  id: number;
  name: string;
  isActive: boolean;
};

const TABLE_CONFIG_KEY = "tableConfig";
const DEFAULT_TABLE_COUNT = 10;

type TableConfigContextValue = {
  tables: TableConfig[];
  activeTables: TableConfig[];
  defaultTable: TableConfig | null;
  addTable: () => void;
  removeTable: (id: number) => void;
  toggleTableActive: (id: number) => void;
  replaceTables: (tables: TableConfig[]) => void;
  refreshFromStorage: () => void;
};

const TableConfigContext = createContext<TableConfigContextValue | undefined>(
  undefined,
);

const isBrowser = () =>
  typeof window !== "undefined" && typeof window.localStorage !== "undefined";

const createDefaultTables = (): TableConfig[] =>
  Array.from({ length: DEFAULT_TABLE_COUNT }, (_, index) => ({
    id: index + 1,
    name: `Table${index + 1}`,
    isActive: true,
  }));

const persistTableConfig = (tables: TableConfig[]) => {
  if (!isBrowser()) {
    return;
  }
  window.localStorage.setItem(TABLE_CONFIG_KEY, JSON.stringify(tables));
};

const readTableConfig = (): TableConfig[] => {
  if (!isBrowser()) {
    return createDefaultTables();
  }

  try {
    const stored = window.localStorage.getItem(TABLE_CONFIG_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as TableConfig[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (error) {
    console.warn("Failed to parse table config. Resetting to defaults.", error);
  }

  const defaults = createDefaultTables();
  persistTableConfig(defaults);
  return defaults;
};

const useProvideTableConfig = (): TableConfigContextValue => {
  const [tables, setTables] = useState<TableConfig[]>(() => readTableConfig());

  const updateTables = useCallback(
    (
      updater:
        | TableConfig[]
        | ((previous: TableConfig[]) => TableConfig[]),
    ) => {
      setTables((previous) => {
        const prevTables = previous ?? [];
        const nextTables =
          typeof updater === "function"
            ? (updater as (prev: TableConfig[]) => TableConfig[])(prevTables)
            : updater;

        persistTableConfig(nextTables);
        return nextTables;
      });
    },
    [],
  );

  const addTable = useCallback(() => {
    updateTables((prev) => {
      const nextId =
        prev.length > 0 ? Math.max(...prev.map((table) => table.id)) + 1 : 1;
      return [...prev, { id: nextId, name: `Table${nextId}`, isActive: true }];
    });
  }, [updateTables]);

  const removeTable = useCallback(
    (id: number) => {
      updateTables((prev) => prev.filter((table) => table.id !== id));
    },
    [updateTables],
  );

  const toggleTableActive = useCallback(
    (id: number) => {
      updateTables((prev) =>
        prev.map((table) =>
          table.id === id ? { ...table, isActive: !table.isActive } : table,
        ),
      );
    },
    [updateTables],
  );

  const replaceTables = useCallback(
    (nextTables: TableConfig[]) => {
      updateTables(nextTables);
    },
    [updateTables],
  );

  const refreshFromStorage = useCallback(() => {
    setTables(readTableConfig());
  }, []);

  useEffect(() => {
    if (!isBrowser()) {
      return;
    }

    const handleStorageSync = (event: StorageEvent) => {
      if (event.key === TABLE_CONFIG_KEY) {
        setTables(readTableConfig());
      }
    };

    window.addEventListener("storage", handleStorageSync);
    return () => window.removeEventListener("storage", handleStorageSync);
  }, []);

  const activeTables = useMemo(
    () => tables.filter((table) => table.isActive),
    [tables],
  );

  const defaultTable = useMemo(
    () => activeTables[0] ?? tables[0] ?? null,
    [activeTables, tables],
  );

  return {
    tables,
    activeTables,
    defaultTable,
    addTable,
    removeTable,
    toggleTableActive,
    replaceTables,
    refreshFromStorage,
  };
};

export const TableConfigProvider = ({ children }: PropsWithChildren) => {
  const value = useProvideTableConfig();

  return (
    <TableConfigContext.Provider value={value}>
      {children}
    </TableConfigContext.Provider>
  );
};

export const useTableConfig = (): TableConfigContextValue => {
  const context = useContext(TableConfigContext);

  if (!context) {
    throw new Error("useTableConfig must be used within TableConfigProvider");
  }

  return context;
};

export const getTableUrl = (table: TableConfig) =>
  `/menu?table=${encodeURIComponent(table.name)}`;

export const getCheckoutUrl = (
  table: TableConfig,
  type: string = "pay-fully",
) => `/checkout/${type}?table=${encodeURIComponent(table.name)}`;

