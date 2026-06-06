export type Language =
  | 'python'
  | 'javascript'
  | 'typescript'
  | 'java'
  | 'cpp'
  | 'c'
  | 'csharp'
  | 'go'
  | 'rust'
  | 'ruby'
  | 'kotlin'
  | 'swift'
  | 'php'
  | 'r'
  | 'scala'
  | 'bash'
  | 'haskell'
  | 'lua'
  | 'perl'
  | 'elixir'

export const defaultTemplates: Record<Language, string> = {
  python: `import sys

def main():
    name = input()
    print(f"Hello, {name}!")

if __name__ == "__main__":
    main()
`,

  javascript: `const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false,
});

const lines = [];
rl.on('line', (line) => lines.push(line));
rl.on('close', () => {
  const name = lines[0] ?? 'World';
  console.log(\`Hello, \${name}!\`);
});
`,

  typescript: `import * as readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false,
});

const lines: string[] = [];
rl.on('line', (line: string) => lines.push(line));
rl.on('close', () => {
  const name: string = lines[0] ?? 'World';
  console.log(\`Hello, \${name}!\`);
});
`,

  java: `import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);
        String name = scanner.nextLine();
        System.out.println("Hello, " + name + "!");
        scanner.close();
    }
}
`,

  cpp: `#include <iostream>
#include <string>
using namespace std;

int main() {
    string name;
    getline(cin, name);
    cout << "Hello, " << name << "!" << endl;
    return 0;
}
`,

  c: `#include <stdio.h>
#include <string.h>

int main() {
    char name[256];
    fgets(name, sizeof(name), stdin);
    name[strcspn(name, "\\n")] = 0;
    printf("Hello, %s!\\n", name);
    return 0;
}
`,

  csharp: `using System;

class Main {
    static void Main(string[] args) {
        string name = Console.ReadLine() ?? "World";
        Console.WriteLine($"Hello, {name}!");
    }
}
`,

  go: `package main

import (
\t"bufio"
\t"fmt"
\t"os"
\t"strings"
)

func main() {
\treader := bufio.NewReader(os.Stdin)
\tname, _ := reader.ReadString('\\n')
\tname = strings.TrimSpace(name)
\tfmt.Printf("Hello, %s!\\n", name)
}
`,

  rust: `use std::io::{self, BufRead};

fn main() {
    let stdin = io::stdin();
    let name = stdin.lock().lines().next().unwrap().unwrap();
    println!("Hello, {}!", name);
}
`,

  ruby: `name = gets.chomp
puts "Hello, #{name}!"
`,

  kotlin: `fun main() {
    val name = readLine() ?: "World"
    println("Hello, $name!")
}
`,

  swift: `import Foundation

if let name = readLine() {
    print("Hello, \\(name)!")
}
`,

  php: `<?php
$name = trim(fgets(STDIN));
echo "Hello, $name!\\n";
`,

  r: `name <- readLines("stdin", n = 1)
cat(sprintf("Hello, %s!\\n", name))
`,

  scala: `import scala.io.StdIn

object Main {
  def main(args: Array[String]): Unit = {
    val name = StdIn.readLine()
    println(s"Hello, $name!")
  }
}
`,

  bash: `#!/bin/bash
read -r name
echo "Hello, $name!"
`,

  haskell: `main :: IO ()
main = do
    name <- getLine
    putStrLn ("Hello, " ++ name ++ "!")
`,

  lua: `local name = io.read()
print("Hello, " .. name .. "!")
`,

  perl: `use strict;
use warnings;

my $name = <STDIN>;
chomp $name;
print "Hello, $name!\\n";
`,

  elixir: `name = IO.gets("") |> String.trim()
IO.puts("Hello, \#{name}!")
`,
}
