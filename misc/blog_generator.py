import os

HTMLFILLER_START = """<html data-theme="light" style="overflow-x: hidden;">"""

HEAD_START = """<head style="overflow-x: hidden;">
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Harald Tverdal</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bulma@1.0.0/css/bulma.min.css">
    <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
    <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
    <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">
    <link rel="manifest" href="/site.webmanifest">"""

BURGER_SCRIPT = """ <script>
      document.addEventListener('DOMContentLoaded', () => {

      const navBar = document.getElementById("navbar_main");
      const navMenu = document.getElementById("navbar_menu");
      const burger = document.getElementById("navbar_burger");

      burger.addEventListener('click', ()=> {
        navBar.classList.toggle("is-active");
        burger.classList.toggle("is-active");
        navMenu.classList.toggle("is-active");
      });

});
    </script>"""

HEAD_END = """</head>"""

BODY_START = """<body style="overflow-x: hidden;">"""



BODY_END = """</body>"""

HTMLFILLER_END = """</html>"""


def readFile(fileName):
    with open(fileName) as file:
        inputText = file.read()
    return inputText

# def addHeader(fileName):
    # with open(fileName) as file:


def cli():
    print(HEAD_START)

cli()