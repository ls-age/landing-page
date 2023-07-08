import marked from 'marked';
import slugify from 'slugify';
import { highlight } from 'highlight.js';

const stripHtml = (text) => text.replace(/(<([^>]+)>)/gi, '');
const getSlug = (name) => slugify(stripHtml(name), { lower: true, remove: /[^a-z0-9 -]/gi });

export class TocRenderer extends marked.Renderer {
  constructor() {
    super();

    this.meta = {
      title: undefined,
      slug: undefined,
      sections: [],
    };

    this.sectionTree = [];
  }

  heading(text, level) {
    const slug = getSlug(text);

    if (level === 1) {
      if (!this.meta.title) {
        this.meta.title = stripHtml(text);
        this.meta.slug = slug;
      } else {
        // eslint-disable-next-line no-console
        console.warn('Markdown contains multiple level 1 headers', text);
      }
    } else {
      while (this.sectionTree.length > level - 2) {
        this.sectionTree.pop();
      }

      const section = { title: stripHtml(text), slug };

      if (this.sectionTree.length) {
        const last = this.sectionTree[this.sectionTree.length - 1];

        if (!last.children) {
          last.children = [];
        }
        last.children.push(section);
      } else {
        this.meta.sections.push(section);
      }

      this.sectionTree.push(section);
    }

    return `<h${level} id="${slug}">${text}</h${level}>`; // <a name="${slug}"></a>
  }
}

marked.setOptions({
  highlight(code, lang) {
    if (!lang) return code;

    try {
      return highlight(lang, code).value;
    } catch (e) {
      console.log(`Unable to highlight code block: ${code.split('\n')[0].slice(0, 30)} (${lang})`);
      return code;
    }
  },
});

export function processMarkdown(markdown) {
  const renderer = new TocRenderer();
  const content = marked(markdown, { renderer });

  return {
    ...renderer.meta,
    content,
  };
}
