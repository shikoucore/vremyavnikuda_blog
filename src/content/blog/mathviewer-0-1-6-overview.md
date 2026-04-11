---
title: "数式を1つ見るためにWordを開く必要はある？MathViewerの紹介"
description: "MathViewer は .mathml / .mml を手軽に表示するための小さな無料ツールです。v0.1.6 の現状、ライセンス、対応プラットフォーム、今後の展開をまとめました。"
pubDate: 2026-04-11
tags: ["mathviewer", "mathml", "mml", "shikou-core", "windows", "release"]
draft: false
lang: ja
---

<img
  src="/img/mathviewer.svg"
  alt="MathViewer ロゴ"
  style="display: block; margin: 0 auto 1.5rem; max-width: 220px; width: 100%; height: auto;"
/>

> 2026年4月時点で、MathViewer の公開バージョンは **v0.1.6（Windows版）** です。

`.mathml` や `.mml` のファイルを受け取って、「中身を確認したいだけなのに開けない」と困った経験はありませんか。  
数学の式データを見るだけなら本来は軽い作業のはずですが、これまでは Microsoft Word や LibreOffice のような大きなオフィス製品に頼る場面が少なくありませんでした。

## みんなが見過ごしてきた小さな不便

MathML / MML は、数式を構造化して保存するための一般的な形式です。教育コンテンツ、論文、学習プラットフォームなどで広く使われています。  
それでも「表示するだけ」の体験は意外と重く、環境によっては余計な準備が必要になります。

画像を1枚見るために高機能な画像編集ソフトを入れるような感覚に近く、用途に対して道具が大きすぎる場面がありました。

> 参考: LibreOffice は約300MB、Microsoft Word はスイート全体で3〜4GB規模になることがあります。MathViewer は数MB規模で、目的は「数式ファイルを表示すること」に絞られています。

## MathViewer とは

MathViewer は、私たち Shikou Core が開発した小型ユーティリティで、目的は明確です。

- `.mathml` / `.mml` をすぐ開いて内容を確認できること
- 大きなオフィス製品への依存を減らすこと
- 必要最小限の導線で「見たい式を見る」こと

私たちは無料で提供しており、インストールしてすぐ使えます。数式表示という目的にまっすぐ集中できるよう設計しています。

## ライセンスについて

無料ソフトでもライセンス表記があると身構えることがありますよね。私たちのケースでは、ポイントはシンプルです。

- エンドユーザーの利用は無料
- 著作権と商用再配布に関する権利は、開発元である私たちが保持

教育用途や個人用途で通常使う分には、実務上ほとんど支障のない形です。

## どんな人に向いているか

私たちは、次のような場面を想定して MathViewer を作っています。

- 学生や教員が MathML 形式の課題・資料を確認するとき
- 研究者や編集者が式ファイルの見た目を素早くチェックしたいとき
- 教育系サービス開発で、受け取った式データをすぐ検証したいとき

「1ファイル確認するだけ」のために重いセットアップを避けたい人には、特に相性が良いです。

## macOS / Linux 版は開発中

現時点で私たちが公開しているのは Windows 版ですが、macOS と Linux 版も私たちが現在開発中です。  
この2プラットフォームは教育・研究・開発の現場で利用者が多く、対応が進めば実用範囲は大きく広がるはずです。

現状:

- macOS: 開発中
- Linux: 開発中
- Windows: 利用可能（v0.1.6）

## ダウンロードとリンク

- [GitLab リポジトリ](https://gitlab.com/vremyavnikuda1/math_viewer)
- [Windows インストーラー（v0.1.6）](https://gitlab.com/vremyavnikuda1/math_viewer/-/raw/main/Installer/output/MathViewer-0.1.6-Setup.exe?ref_type=heads&inline=false)
- [Shikou Core（GitHub）](https://github.com/shikoucore)

小さなユースケースに対して、ちょうどいい道具を用意する。  
私たちは MathViewer を、そうした「ちょうどよさ」を埋めるためのツールとして作りました。
