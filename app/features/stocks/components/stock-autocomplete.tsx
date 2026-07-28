import type { StockSearchResult } from "../types";

import { LoaderCircleIcon, SearchIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Input } from "~/core/components/ui/input";
import { cn } from "~/core/lib/utils";

interface StockAutocompleteProps {
  id: string;
  value: string;
  selectedStock: StockSearchResult | null;
  onValueChange: (value: string) => void;
  onSelect: (stock: StockSearchResult) => void;
}

export function StockAutocomplete({
  id,
  value,
  selectedStock,
  onValueChange,
  onSelect,
}: StockAutocompleteProps) {
  const [results, setResults] = useState<StockSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [showSelectionError, setShowSelectionError] = useState(false);
  const requestId = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const closeResultsWhenHidden = () => {
      if (document.visibilityState === "hidden") setIsOpen(false);
    };

    document.addEventListener("visibilitychange", closeResultsWhenHidden);
    return () =>
      document.removeEventListener("visibilitychange", closeResultsWhenHidden);
  }, []);

  useEffect(() => {
    const query = value.trim();

    if (!query || selectedStock) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    const currentRequestId = ++requestId.current;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setIsLoading(true);

      try {
        const response = await fetch(
          `/api/stocks/search?q=${encodeURIComponent(query)}`,
          { signal: controller.signal },
        );

        if (!response.ok) throw new Error("종목 검색에 실패했습니다.");

        const body = (await response.json()) as {
          stocks: StockSearchResult[];
        };

        if (requestId.current === currentRequestId) {
          setResults(body.stocks);
          setActiveIndex(-1);
          setIsOpen(
            document.visibilityState === "visible" &&
              document.activeElement === inputRef.current,
          );
        }
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError")
          return;
        if (requestId.current === currentRequestId) setResults([]);
      } finally {
        if (requestId.current === currentRequestId) setIsLoading(false);
      }
    }, 250);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [selectedStock, value]);

  const selectStock = (stock: StockSearchResult) => {
    onSelect(stock);
    setResults([]);
    setIsOpen(false);
    setActiveIndex(-1);
    setShowSelectionError(false);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || results.length === 0) {
      if (event.key === "ArrowDown" && results.length > 0) setIsOpen(true);
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => (index + 1) % results.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => (index <= 0 ? results.length - 1 : index - 1));
    } else if (event.key === "Enter" && activeIndex >= 0) {
      event.preventDefault();
      selectStock(results[activeIndex]);
    } else if (event.key === "Escape") {
      setIsOpen(false);
    }
  };

  return (
    <div
      className="relative"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setIsOpen(false);
          setShowSelectionError(Boolean(value.trim()) && !selectedStock);
        }
      }}
    >
      <div className="relative">
        {isLoading ? (
          <LoaderCircleIcon className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 z-10 size-4 -translate-y-1/2 animate-spin" />
        ) : (
          <SearchIcon className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 z-10 size-4 -translate-y-1/2" />
        )}
        <Input
          ref={inputRef}
          id={id}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={isOpen && results.length > 0}
          aria-controls={`${id}-results`}
          aria-activedescendant={
            activeIndex >= 0 ? `${id}-option-${activeIndex}` : undefined
          }
          value={value}
          onChange={(event) => {
            onValueChange(event.target.value);
            setIsOpen(true);
            setShowSelectionError(false);
          }}
          onFocus={() => {
            setShowSelectionError(false);
            if (results.length > 0) setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder="예: 삼성전자, AAPL"
          autoComplete="off"
          className={cn(
            "bg-background h-11 pl-9",
            showSelectionError &&
              "border-destructive focus-visible:ring-destructive",
          )}
        />

        {isOpen && value.trim() && !isLoading && (
          <div
            id={`${id}-results`}
            role="listbox"
            className="bg-popover absolute top-full right-0 left-0 z-30 mt-1 max-h-72 overflow-y-auto rounded-xl border p-1.5 shadow-xl"
          >
            {results.length > 0 ? (
              results.map((stock, index) => (
                <button
                  key={stock.stockId}
                  id={`${id}-option-${index}`}
                  type="button"
                  role="option"
                  aria-selected={activeIndex === index}
                  onMouseDown={(event) => event.preventDefault()}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => selectStock(stock)}
                  className={cn(
                    "flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left transition-colors",
                    activeIndex === index && "bg-accent",
                  )}
                >
                  <span className="min-w-0">
                    <strong className="block truncate text-sm">
                      {stock.name}
                    </strong>
                    {stock.nameEn && stock.nameEn !== stock.name && (
                      <span className="text-muted-foreground block truncate text-xs">
                        {stock.nameEn}
                      </span>
                    )}
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="block text-sm font-semibold">
                      {stock.ticker}
                    </span>
                    <span className="text-muted-foreground block text-[11px]">
                      {stock.exchange} · {stock.securityType}
                    </span>
                  </span>
                </button>
              ))
            ) : (
              <p className="text-muted-foreground px-3 py-4 text-center text-sm">
                검색 결과가 없습니다.
              </p>
            )}
          </div>
        )}
      </div>

      {showSelectionError && (
        <p className="text-destructive mt-1.5 text-xs">
          추천 목록에서 정확한 종목을 선택해 주세요.
        </p>
      )}
    </div>
  );
}
