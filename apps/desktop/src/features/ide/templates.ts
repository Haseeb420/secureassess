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
from typing import List

def solve(input_data: str) -> str:
    # Write your solution here
    lines = input_data.strip().split('\\n')
    result = lines[0]
    return result

if __name__ == "__main__":
    data = sys.stdin.read()
    print(solve(data))
`,

  javascript: `const readline = require('readline');

function solve(inputData) {
    // Write your solution here
    const lines = inputData.trim().split('\\n');
    return lines[0];
}

const rl = readline.createInterface({ input: process.stdin, terminal: false });
const lines = [];
rl.on('line', (line) => lines.push(line));
rl.on('close', () => {
    console.log(solve(lines.join('\\n')));
});
`,

  typescript: `declare function require(module: string): any;
declare const process: any;

const readline = require('readline');

function solve(inputData: string): string {
    // Write your solution here
    const lines = inputData.trim().split('\\n');
    return lines[0];
}

const rl = readline.createInterface({ input: process.stdin, terminal: false });
const lines: string[] = [];
rl.on('line', (line: string) => lines.push(line));
rl.on('close', () => {
    console.log(solve(lines.join('\\n')));
});
`,

  java: `import java.util.Scanner;

public class Main {
    public static String solve(String inputData) {
        // Write your solution here
        String[] lines = inputData.trim().split("\\n");
        return lines[0];
    }

    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);
        StringBuilder sb = new StringBuilder();
        while (scanner.hasNextLine()) {
            sb.append(scanner.nextLine()).append("\\n");
        }
        System.out.println(solve(sb.toString()));
        scanner.close();
    }
}
`,

  cpp: `#include <iostream>
#include <sstream>
#include <string>
using namespace std;

string solve(const string& inputData) {
    // Write your solution here
    istringstream iss(inputData);
    string line;
    getline(iss, line);
    return line;
}

int main() {
    ostringstream buffer;
    buffer << cin.rdbuf();
    cout << solve(buffer.str()) << endl;
    return 0;
}
`,

  c: `#include <stdio.h>
#include <string.h>
#include <stdlib.h>

void solve(const char* input, char* output) {
    /* Write your solution here */
    sscanf(input, "%[^\\n]", output);
}

int main() {
    char input[4096] = {0};
    char output[4096] = {0};
    fread(input, 1, sizeof(input) - 1, stdin);
    solve(input, output);
    printf("%s\\n", output);
    return 0;
}
`,

  csharp: `using System;
using System.IO;

class Main {
    static string Solve(string inputData) {
        // Write your solution here
        var lines = inputData.Trim().Split('\\n');
        return lines[0];
    }

    static void Main(string[] args) {
        string input = Console.In.ReadToEnd();
        Console.WriteLine(Solve(input));
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

func solve(inputData string) string {
\t// Write your solution here
\tlines := strings.Split(strings.TrimSpace(inputData), "\\n")
\treturn lines[0]
}

func main() {
\treader := bufio.NewReader(os.Stdin)
\tvar sb strings.Builder
\tfor {
\t\tline, err := reader.ReadString('\\n')
\t\tsb.WriteString(line)
\t\tif err != nil {
\t\t\tbreak
\t\t}
\t}
\tfmt.Println(solve(sb.String()))
}
`,

  rust: `use std::io::{self, Read};

fn solve(input: &str) -> String {
    // Write your solution here
    input.lines().next().unwrap_or("").to_string()
}

fn main() {
    let mut input = String::new();
    io::stdin().read_to_string(&mut input).unwrap();
    println!("{}", solve(&input));
}
`,

  ruby: `def solve(input_data)
  # Write your solution here
  lines = input_data.strip.split("\\n")
  lines[0]
end

input = $stdin.read
puts solve(input)
`,

  kotlin: `fun solve(inputData: String): String {
    // Write your solution here
    return inputData.trim().lines().first()
}

fun main() {
    val input = generateSequence(::readLine).joinToString("\\n")
    println(solve(input))
}
`,

  swift: `import Foundation

func solve(_ inputData: String) -> String {
    // Write your solution here
    let lines = inputData.trimmingCharacters(in: .whitespacesAndNewlines).components(separatedBy: "\\n")
    return lines.first ?? ""
}

var input = ""
while let line = readLine() {
    input += line + "\\n"
}
print(solve(input))
`,

  php: `<?php
function solve(string $inputData): string {
    // Write your solution here
    $lines = explode("\\n", trim($inputData));
    return $lines[0];
}

$input = stream_get_contents(STDIN);
echo solve($input) . "\\n";
`,

  r: `solve <- function(input_data) {
  # Write your solution here
  lines <- strsplit(trimws(input_data), "\\n")[[1]]
  return(lines[1])
}

input <- paste(readLines(con = stdin()), collapse = "\\n")
cat(solve(input), "\\n", sep = "")
`,

  scala: `import scala.io.StdIn

object Main {
  def solve(inputData: String): String = {
    // Write your solution here
    inputData.trim.split("\\n").head
  }

  def main(args: Array[String]): Unit = {
    val input = Iterator.continually(StdIn.readLine())
      .takeWhile(_ != null)
      .mkString("\\n")
    println(solve(input))
  }
}
`,

  bash: `#!/bin/bash

# Read all input
input=$(cat)

# Write your solution here
solve() {
    local data="$1"
    echo "$data" | head -1
}

solve "$input"
`,

  haskell: `import System.IO

solve :: String -> String
solve inputData =
    -- Write your solution here
    head (lines inputData)

main :: IO ()
main = do
    input <- getContents
    putStrLn (solve input)
`,

  lua: `local function solve(inputData)
    -- Write your solution here
    local lines = {}
    for line in inputData:gmatch("[^\\n]+") do
        table.insert(lines, line)
    end
    return lines[1] or ""
end

local input = io.read("*a")
print(solve(input))
`,

  perl: `use strict;
use warnings;

sub solve {
    my ($input_data) = @_;
    # Write your solution here
    my @lines = split /\\n/, $input_data;
    return $lines[0] // "";
}

my $input = do { local $/; <STDIN> };
print solve($input) . "\\n";
`,

  elixir: `defmodule Solution do
  def solve(input_data) do
    # Write your solution here
    input_data
    |> String.trim()
    |> String.split("\\n")
    |> List.first()
  end
end

input = IO.read(:stdio, :all)
IO.puts(Solution.solve(input))
`,
}
