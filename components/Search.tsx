"use client";

import Image from "next/image";
import React, { useCallback, useEffect, useState } from "react";
import { Input } from "./ui/input";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { getFiles } from "@/lib/actions/file.actions";
import { Models } from "node-appwrite";
import Thumbnail from "./Thumbnail";
import FormattedDateTime from "./FormattedDateTime";
import { useDebounce } from "use-debounce";

const Search = () => {
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const searchParams = useSearchParams();

  const searchQuery = searchParams.get("query") || "";

  const [results, setResults] = useState<Models.Document[]>();

  const [open, setOpen] = useState(false);

  const router = useRouter();
  const path = usePathname();

  const [debouncedQuery] = useDebounce(query, 300);

  // const fetchFiles = useCallback(
  //   debounce(async (q : string) => {
  //     if (!q) {
  //       setResults([]);
  //       setOpen(false);
  //       return;
  //     }

  //     const files = await getFiles({types : [],  searchText  : q,});
  //     console.log("fetched files");

  //     setResults(files.documents);
  //     setOpen(true);
  //   }, 200), // Adjust debounce delay (e.g., 300ms)
  //   []
  // );
  
  
  useEffect(() => {
    const fetchFiles = async () => {
      console.log(query);
      
      if (debouncedQuery.length === 0) {
        setResults([]);
        setOpen(false);
        setIsLoading(false);
        return router.push(path.replace(searchParams.toString(), ""));
      }

      setIsLoading(true);
      try {
        const files = await getFiles({ types: [], searchText: debouncedQuery });
        
        setResults(files.documents);
        setOpen(true);
        console.log(open);
      } catch (error) {
        console.log("Error in loading files in search box", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchFiles();
  }, [debouncedQuery]);

  useEffect(() => {
    if (!searchQuery) {
      setQuery("");
    }
  }, [searchQuery]);

  const handleClickItem = async (file: Models.Document) => {
    setOpen(false);
    setResults([]);

    router.push(
      `/${
        file.type === "video" || file.type === "audio"
          ? "media"
          : file.type + "s"
      }?query=${query}`
    );
  };

  return (
    <div className="search">
      <div className="search-input-wrapper">
        <Image
          src="/assets/icons/search.svg"
          alt="Search"
          width={24}
          height={24}
        />
        <Input
          value={query}
          placeholder="Search..."
          className="search-input"
          onChange={(e) => setQuery(e.target.value)}
        />

        {open &&
          (isLoading ? (
            <div className="absolute left-0 top-full w-full bg-dark-800 shadow-lg z-50">
            <div className="flex justify-center items-center py-6">
            <div className="animate-spin rounded-full h-10 w-10 border-t-4 border-blue-500"></div>
          </div>
          </div>
          
          ) : (
            <ul className="search-result">
              {results && results.length > 0 ? (
                results.map((file) => (
                  <li
                    key={file.$id}
                    className="flex items-center justify-between"
                    onClick={() => handleClickItem(file)}
                  >
                    <div className="flex cursor-pointer items-center gap-4">
                      <Thumbnail
                        type={file.type}
                        extension={file.extension}
                        url={file.url}
                        className="size-9 min-w-9"
                      />
                      <p className="subtitle-2 line-clamp-1 text-light-100">
                        {file.name}
                      </p>
                    </div>
                    <FormattedDateTime
                      date={file.$createdAt}
                      className="caption line-clamp-1 text-light-200"
                    />
                  </li>
                ))
              ) : (
                <p className="empty-result">No results</p>
              )}
            </ul>
          ))}
      </div>
    </div>
  );
};

export default Search;
