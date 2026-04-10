# build a simple hello world application in python
import tkinter as tk
 
def show_greeting():
    name = name_entry.get().strip() or "World"
    root.title("Hello!")
    frame_input.pack_forget()
    label_greeting.config(text=f"Hello, {name}!")
    frame_greeting.pack(expand=True)
 
root = tk.Tk()
root.title("Hello World")
root.geometry("300x180")
root.resizable(False, False)
 
# --- Input screen ---
frame_input = tk.Frame(root, padx=30, pady=30)
frame_input.pack(expand=True)
 
tk.Label(frame_input, text="What is your name?", font=("Helvetica", 13)).pack(pady=(0, 10))
 
name_entry = tk.Entry(frame_input, font=("Helvetica", 12), width=20, justify="center")
name_entry.pack(pady=(0, 14))
name_entry.focus()
name_entry.bind("<Return>", lambda e: show_greeting())
 
tk.Button(frame_input, text="OK", width=10, font=("Helvetica", 11),
          command=show_greeting).pack()
 
# --- Greeting screen ---
frame_greeting = tk.Frame(root, padx=30, pady=30)
 
label_greeting = tk.Label(frame_greeting, text="", font=("Helvetica", 16, "bold"))
label_greeting.pack(pady=(0, 20))
 
tk.Button(frame_greeting, text="Close", width=10, font=("Helvetica", 11),
          command=root.destroy).pack()
 
root.mainloop()