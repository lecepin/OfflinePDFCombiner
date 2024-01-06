import { createSignal, onMount, For } from "solid-js";
import Sortable from "sortablejs";
import { PDFDocument } from "pdf-lib";

function App() {
  const [files, setFiles] = createSignal<File[]>([]);
  const [mergeDisabled, setMergeDisabled] = createSignal(true);
  const [isLoading, setIsLoading] = createSignal(false);

  onMount(() => {
    const fileList = document.getElementById("file-list");

    if (fileList) {
      new Sortable(fileList, {
        animation: 150,
        ghostClass: "bg-light",
        onEnd: (evt) => {
          const { oldIndex, newIndex } = evt;
          const newFiles = [...files()];
          const [removed] = newFiles.splice(oldIndex as number, 1);
          newFiles.splice(newIndex as number, 0, removed);
          setFiles(newFiles);
        },
      });
    }
  });

  const handleFilesChange = (e: Event) => {
    const input = e.target as HTMLInputElement;
    if (input.files) {
      setFiles(Array.from(input.files));
      setMergeDisabled(false);
    } else {
      setMergeDisabled(true);
    }
  };

  const sortFiles = (order: "asc" | "desc") => {
    const sortedFiles = files()
      .slice()
      .sort((a: File, b: File) => {
        const regexNumeric = /\d+/;
        const numA = a.name.match(regexNumeric)?.[0] || "0";
        const numB = b.name.match(regexNumeric)?.[0] || "0";

        if (!isNaN(Number(numA)) && !isNaN(Number(numB))) {
          return order === "asc"
            ? Number(numA) - Number(numB)
            : Number(numB) - Number(numA);
        }

        const nameA = a.name.toUpperCase();
        const nameB = b.name.toUpperCase();
        return order === "asc"
          ? nameA.localeCompare(nameB, undefined, { numeric: true })
          : nameB.localeCompare(nameA, undefined, { numeric: true });
      });
    setFiles(sortedFiles);
  };

  const mergePdfs = async () => {
    console.log(files());

    setIsLoading(true);

    const mergedPdf = await PDFDocument.create();

    for (const file of files()) {
      const pdfBytes = new Uint8Array(await file.arrayBuffer());
      const pdfDoc = await PDFDocument.load(pdfBytes);
      const copiedPages = await mergedPdf.copyPages(
        pdfDoc,
        pdfDoc.getPageIndices()
      );

      copiedPages.forEach((page) => {
        mergedPdf.addPage(page);
      });
    }
    const mergedPdfBytes = await mergedPdf.save();

    setIsLoading(false);
    download(
      new Blob([mergedPdfBytes], { type: "application/pdf" }),
      Date.now() + ".pdf"
    );
  };

  const download = (blob: Blob, filename: string) => {
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div class="container mt-4">
      <h1 class="mb-4">PDF离线合并</h1>
      <input
        type="file"
        class="form-control mb-2"
        id="file-input"
        multiple
        accept="application/pdf"
        onChange={handleFilesChange}
      />
      {!mergeDisabled() && (
        <div class="mb-2">
          <button class="btn btn-primary mr-2" onClick={() => sortFiles("asc")}>
            升序排列
          </button>
          <button
            class="btn btn-primary mr-2"
            onClick={() => sortFiles("desc")}
          >
            降序排列
          </button>
        </div>
      )}
      <ul id="file-list" class="list-group mb-2">
        <For each={files()}>
          {(file, index) => (
            <li
              class="list-group-item d-flex justify-content-between align-items-center"
              data-index={index()}
            >
              {file.name}
              <span class="badge badge-primary badge-pill">{index() + 1}</span>
            </li>
          )}
        </For>
      </ul>
      <button
        class="btn btn-success"
        onClick={mergePdfs}
        disabled={mergeDisabled() || isLoading()}
      >
        {isLoading() ? (
          <>
            <span class="spinner-border spinner-border-sm"></span>
            正在合并...
          </>
        ) : (
          "合并PDF"
        )}
      </button>
    </div>
  );
}

export default App;
