export type Language = 'cpp' | 'python' | 'javascript' | 'typescript' | 'java' | 'go'

export const defaultTemplates: Record<Language, string> = {
  cpp: `#include <iostream>
#include <string>
using namespace std;

int main() {
    string name;
    cin >> name;
    cout << "Hello, " << name << "!" << endl;
    return 0;
}
`,

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
}
