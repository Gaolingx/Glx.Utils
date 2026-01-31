#!/usr/bin/env python3
import pypandoc
import sys
import os


def html_to_markdown(html_input, md_output=None):
    """
    将 HTML 文件转换为 Markdown 格式

    参数:
        html_input: HTML 文件路径或 HTML 字符串
        md_output: 输出的 Markdown 文件路径（可选）

    返回:
        转换后的 Markdown 内容字符串
    """
    try:
        # 转换 HTML 为 Markdown
        pypandoc.__pandoc_path = "./pandoc-3.8.3/pandoc.exe"
        output = pypandoc.convert_text(
            html_input if '\n' in html_input or not html_input.endswith('.html') else None,
            'md',
            format='html',
            outputfile=md_output,
            extra_args=['--wrap=none']  # 不自动换行
        )

        if md_output:
            print(f"转换完成！Markdown 文件已保存至: {md_output}")
            return None
        else:
            return output

    except Exception as e:
        print(f"转换失败: {e}")
        return None


def main():
    # 使用方法示例
    if len(sys.argv) > 1:
        # 命令行模式
        html_file = sys.argv[1]
        md_file = sys.argv[2] if len(sys.argv) > 2 else html_file.replace('.html', '.md')

        if os.path.exists(html_file):
            html_to_markdown(html_file, md_file)
        else:
            print(f"文件不存在: {html_file}")
    else:
        # 交互式示例
        html_content = """
        <html>
        <body>
            <h1>标题示例</h1>
            <p>这是一个<strong>加粗</strong>的段落。</p>
            <ul>
                <li>列表项1</li>
                <li>列表项2</li>
            </ul>
        </body>
        </html>
        """

        result = html_to_markdown(html_content)
        print("转换结果:")
        print(result)


if __name__ == "__main__":
    main()
