use std::env;
use std::process::Command;

fn main() {
    let args: Vec<String> = env::args().collect();
    if args.len() < 2 {
        eprintln!("Usage: {} <file_to_sign>", args[0]);
        std::process::exit(1);
    }
    let file_to_sign = &args[1];

    let ps_cmd = format!(
        "if (Test-Path src-tauri/sign.ps1) {{ & src-tauri/sign.ps1 '{}' }} else {{ & ./sign.ps1 '{}' }}",
        file_to_sign, file_to_sign
    );

    println!("sign.exe: Spawning powershell with command: {}", ps_cmd);

    let status = Command::new("powershell.exe")
        .arg("-ExecutionPolicy")
        .arg("Bypass")
        .arg("-Command")
        .arg(&ps_cmd)
        .status();

    match status {
        Ok(s) => {
            if !s.success() {
                eprintln!("Powershell script exited with non-zero status: {:?}", s.code());
                std::process::exit(s.code().unwrap_or(1));
            }
        }
        Err(e) => {
            eprintln!("Failed to execute powershell process: {}", e);
            std::process::exit(1);
        }
    }
}
