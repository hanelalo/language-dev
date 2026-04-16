import { Readability } from "@mozilla/readability";

export type ArticleInfo = {
  title: string;
  contentHTML: string;
  isArticle: boolean;
};

export function detectArticle(): ArticleInfo | null {
  const clonedDoc = document.cloneNode(true) as Document;
  const reader = new Readability(clonedDoc);
  const article = reader.parse();

  if (!article || !article.content) {
    return null;
  }

  return {
    title: article.title,
    contentHTML: article.content,
    isArticle: true,
  };
}
