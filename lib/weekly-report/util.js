const filter = require('lodash/filter');

class TOCTreeNode {
  constructor({ id, parent, data, children } = {}) {
    this.id = +id || 0;
    this.parent = parent || null;
    this.data = data || null;
    this.children = Array.isArray(children) ? children : [];
  }

  appendChild(node) {
    this.children.push(node);
    node.parent = this;
  }
}

class TOCTree {
  constructor(list) {
    this.id = 0;
    this.nodeMap = new Map();

    this.initFromTOCList(list);
  }

  initFromTOCList(list = []) {
    this.id = 0;
    this.nodeMap = new Map();

    this.root = this.createNode({
      data: { title: '__TOC_ROOT', slug: '__TOC_ROOT', depth: 0 }
    });
    this.nodeMap.set(this.root.id, this.root);

    let index = 0;
    let lastNode = null;
    let parent = this.root;
    while (index < list.length) {
      const item = list[index];

      if (lastNode && lastNode.data.depth < item.depth) {
        // depth 比前一项大了, 说明向下一层
        parent = lastNode;
      }

      while (parent.data.depth >= item.depth) {
        // parent depth 比当前项小了, 不断往上
        parent = parent.parent;
      }

      if (item.depth - parent.data.depth !== 1) {
        // 和 parent depth 相差不等于 1, 说明 TOC 数据有问题
        throw new Error(
          `TOC 数据错误: ${parent.data.title}(${parent.data.slug}) 深度为 ${parent.data.depth}, 而 ${item.title}(${item.slug}) 深度为 ${item.depth}`
        );
      }

      const node = this.createNode({
        data: item
      });

      parent.appendChild(node);

      lastNode = node;
      index++;
    }
  }

  createNode({ data } = {}) {
    const node = new TOCTreeNode({
      id: ++this.id,
      data
    });
    this.nodeMap.set(node.id, node);
    return node;
  }

  getTOCList() {
    const { root } = this;
    let stack = [{ node: root, depth: 0 }];

    const list = [];
    while (stack.length) {
      const { node, depth } = stack.pop();
      const { slug, title } = node.data;
      list.push({
        depth,
        slug,
        title
      });
      stack = stack.concat(
        node.children
          .slice()
          .reverse()
          .map(childNode => ({ node: childNode, depth: depth + 1 }))
      );
    }

    // 去掉根节点
    return list.slice(1);
  }

  find(predicate = identity) {
    return filter([...this.nodeMap.values()], predicate);
  }
}

function compareFnForWeeklyReportTitle(a, b) {
  const [aDateStr] = a.split('~');
  const [bDateStr] = b.split('~');
  const aDate = new Date(bDateStr);
  if (Number.isNaN(aDate.getTime())) {
    // 非日期, 全排后面
    return 1;
  }
  return aDate - new Date(aDateStr);
}

function transformTOCListToTOCMarkdownText(list) {
  return list
    .map(
      item => `${'  '.repeat(item.depth - 1)}- [${item.title}](${item.slug})`
    )
    .join('\n');
}

module.exports = {
  TOCTree,
  compareFnForWeeklyReportTitle,
  transformTOCListToTOCMarkdownText
};
