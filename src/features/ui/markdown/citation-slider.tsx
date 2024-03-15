import { Button } from "@/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/ui/sheet";
import { FC, useEffect, useState } from "react";
import { useFormState } from "react-dom";
import { ScrollArea } from "../scroll-area";
import { useMarkdownContext } from "./markdown-context";
import { blobFileHandler } from "@/features/blob-services/blob-file-handler";

interface SliderProps {
  name: string;
  index: number;
  id: string;
  blobPage:any;
  blobName:any;
  items:any;
}

export const CitationSlider: FC<SliderProps> = (props) => {
  const { onCitationClick } = useMarkdownContext();

   if (!onCitationClick) throw new Error("onCitationClick is null");

  const [node, formAction] = useFormState(onCitationClick, null);

  const [sasToken, setSasToken] = useState<string | undefined>();
  const page = parseInt(props.items ?? "0");
  useEffect(() => {
    const fetchData = async () => {
      const prop = {
        blobName: props.blobName ?? "",
      };
      const sastoken = await blobFileHandler(prop);
      setSasToken(sastoken);
    };

    fetchData();
  }, []);

  return (
  <div className="flex">
      <form>
      <input type="hidden" name="id" value={props.id} />
      <Sheet>
        <SheetTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            formAction={formAction}
            type="submit"
            value={22}
          >
            P:{page}
          </Button>
        </SheetTrigger>
        <SheetContent size="LG">
          <SheetHeader>
            <SheetTitle>{props.blobName}</SheetTitle>
          </SheetHeader>
          {/* <div className="text-sm text-muted-foreground">{node}</div> */}
          <div className="flex">
            {sasToken ? (
              <iframe
                src={`${sasToken}#page=${page}`}
                width="650px"
                height="900px"
                allowFullScreen
              ></iframe>
            ) : (
              <p>Loading...</p>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </form>
  </div>
  );
};