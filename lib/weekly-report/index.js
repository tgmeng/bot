const path = require('path');
const fs = require('fs');

const startOfWeek = require('date-fns/startOfWeek');
const endOfWeek = require('date-fns/endOfWeek');
const format = require('date-fns/format');
const subWeeks = require('date-fns/subWeeks');

const SDK = require('@yuque/sdk');

const {
  TOCTree,
  transformTOCListToTOCMarkdownText,
  compareFnForWeeklyReportTitle
} = require('./util');

const [token] = process.argv.slice(2);

function getWeeklyId(date) {
  const f = 'yyyy-MM-dd';
  return `${format(startOfWeek(date), f)}~${format(endOfWeek(date), f)}`;
}

async function main() {
  const namespace = 'langouzao/work';

  const client = new SDK({
    token
  });

  const now = new Date();

  const title = getWeeklyId(now);

  const docList = await client.docs.list({
    namespace
  });

  let doc = docList.find(item => item.title === title);
  if (doc) {
    console.warn(`已经有周报 "${doc.title}" 啦!`);
  } else {
    const lastWeekTitle = getWeeklyId(subWeeks(now, 1));
    const lastWeekReport = docList.find(item => item.title === lastWeekTitle);

    let body = '';

    if (lastWeekReport) {
      const lastWeekReportDetail = await client.docs.get({
        namespace,
        slug: lastWeekReport.slug
      });
      body = lastWeekReportDetail['body_lake'];
    }

    doc = await client.docs.create({
      namespace,
      data: {
        title,
        public: 0,
        format: 'lake',
        body
      }
    });
  }

  const tocTree = new TOCTree(await client.repos.getTOC({ namespace }));

  const reportRoot = tocTree.find(item => item.data.title === '周报')[0];

  if (!reportRoot) {
    console.error('找不到 "周报", 不整理 TOC 了');
    return;
  }

  if (reportRoot.children.every(report => report.data.title !== doc.title)) {
    // TOC 没有相应链接
    reportRoot.appendChild(
      tocTree.createNode({
        data: {
          title: doc.title,
          slug: doc.slug
        }
      })
    );
  }

  // 周报排序
  console.log('整理周报:');
  reportRoot.children.sort((nodeA, nodeB) =>
    compareFnForWeeklyReportTitle(nodeA.data.title, nodeB.data.title)
  );

  const toc = transformTOCListToTOCMarkdownText(tocTree.getTOCList());
  console.log(toc);

  return client.repos.update({
    namespace,
    data: {
      toc
    }
  });
}

main();
