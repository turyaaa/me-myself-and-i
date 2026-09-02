import random
import tkinter as tk
from tkinter import messagebox, simpledialog

root = tk.Tk()

def gen_random_number():
    root.withdraw()
    secret_num = random.randint(1, 100)
    attempts = 0
    messagebox.showinfo("Yo!", "Guess a number between 1 and 100. You have 5 attempts to guess the correct number. You cant!!!")

    while attempts < 5:
        guess = int(simpledialog.askinteger("Guess", "Try to guess the number, loser: "))
        attempts += 1

        if guess == secret_num:
            messagebox.showinfo("Congratulations!", f"Ok-ok, you have done it. The number really was {secret_num}")
            break
        elif guess < secret_num:
            messagebox.showwarning("Try Again", f"Nope, you loser, the number is higher. You have {5 - attempts} attempts left.")
        else:
            messagebox.showwarning("Try Again", f"Nope, you loser, the number is lower. You have {5 - attempts} attempts left.")

    if attempts >= 5:
        messagebox.showerror("Game Over", f"Told you you couldn't do it! You have used all your attempts. The number was {secret_num}")

gen_random_number()

