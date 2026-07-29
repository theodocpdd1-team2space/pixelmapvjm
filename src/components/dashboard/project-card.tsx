import Link from "next/link";
import { Copy, Download, ExternalLink, Trash2 } from "lucide-react";
import { deleteProjectAction, duplicateProjectAction } from "@/features/projects/actions";
import { formatDateTime, formatResolution } from "@/lib/format";
import { ButtonLink } from "@/components/ui/button";
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";

type ProjectCardProps = {
  project: {
    id: string;
    name: string;
    thumbnail: string | null;
    updatedAt: Date;
    pages: {
      id: string;
      name: string;
      width: number;
      height: number;
    }[];
  };
};

export function ProjectCard({ project }: ProjectCardProps) {
  const firstPage = project.pages[0];

  return (
    <article className="border border-pf-border bg-pf-panel">
      <div className="grid h-36 place-items-center border-b border-pf-border bg-black">
        {project.thumbnail ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={project.thumbnail} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="h-20 w-44 border border-pf-darkRed bg-[linear-gradient(90deg,rgba(255,48,48,0.28)_1px,transparent_1px),linear-gradient(rgba(255,48,48,0.18)_1px,transparent_1px)] bg-[size:16px_16px]" />
        )}
      </div>
      <div className="space-y-4 p-4">
        <div>
          <Link href={`/dashboard/projects/${project.id}`} className="font-brand text-base uppercase hover:text-pf-red">
            {project.name}
          </Link>
          <div className="mt-2 grid grid-cols-3 gap-2 font-mono text-[0.68rem] uppercase text-pf-muted">
            <span>{project.pages.length} PAGE</span>
            <span>{formatResolution(firstPage?.width, firstPage?.height)}</span>
            <span>{formatDateTime(project.updatedAt)}</span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <ButtonLink
            href={firstPage ? `/editor/${project.id}/${firstPage.id}` : `/dashboard/projects/${project.id}`}
            variant="primary"
            className="h-9"
          >
            <ExternalLink size={14} />
            OPEN
          </ButtonLink>
          <ButtonLink href={`/api/projects/${project.id}/export`} variant="secondary" className="h-9">
            <Download size={14} />
            EXPORT
          </ButtonLink>
          <form action={duplicateProjectAction}>
            <input type="hidden" name="projectId" value={project.id} />
            <button className="inline-flex h-9 w-full items-center justify-center gap-2 border border-pf-border bg-pf-panel px-3 text-xs font-semibold uppercase hover:border-pf-red">
              <Copy size={14} />
              DUPLICATE
            </button>
          </form>
          <form action={deleteProjectAction}>
            <input type="hidden" name="projectId" value={project.id} />
            <ConfirmSubmitButton
              message={`Delete ${project.name}?`}
              className="inline-flex h-9 w-full items-center justify-center gap-2 border border-pf-darkRed bg-pf-darkRed/50 px-3 text-xs font-semibold uppercase text-pf-text hover:border-pf-red"
            >
              <Trash2 size={14} />
              DELETE
            </ConfirmSubmitButton>
          </form>
        </div>
      </div>
    </article>
  );
}
