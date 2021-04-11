#include <vector>
#include <string>
#include <iostream>
#include <sstream>
#include <iomanip>
#include <sys/ioctl.h>
#include <unistd.h>
#include <termios.h>

#define KEY_UP 'z'
#define KEY_DOWN 's'
#define KEY_RIGHT 'd'
#define KEY_LEFT 'q'

const std::string DELIMITER = "\n";
enum move { UP, DOWN, RIGHT, LEFT };

char getch() {
    char buf = 0;
    read(0, &buf, 1);
    return buf;
}

class cursel {
public:
    size_t l = 0;
    size_t c = 0;
    size_t tl = 0;
    size_t tc = 0;
    size_t hc = 0;

    cursel(size_t new_l, size_t new_c) {
        l = new_l;
        c = new_c;
    }
};

class ted {
public:
    size_t nrows;
    size_t ncols;
    std::vector<std::string> lines;
    std::vector<cursel> cursels;

    ted(std::string text) {
        // get viewport size
        struct winsize w;
        ioctl(STDOUT_FILENO, TIOCGWINSZ, &w);
        nrows = w.ws_row;
        ncols = w.ws_col;
        // open new page 
        std::cout << "\e[?1049h\e[?25l";
        // set terminal to raw mode
        if (tcgetattr(0, &term) < 0) abort();
        term.c_lflag &= ~ICANON;
        term.c_lflag &= ~ECHO;
        term.c_cc[VMIN] = 1;
        term.c_cc[VTIME] = 0;
        if (tcsetattr(0, TCSANOW, &term) < 0) abort();
        // clear();
        // convert input to lines
        size_t last = 0, next = 0; 
        while ((next = text.find(DELIMITER, last)) != std::string::npos) {
            lines.emplace_back(text.substr(last, next-last));
            last = next + 1;
        }
        // add one cursel
        cursels.emplace_back(0, 0);
        // populate screen
        render();
    }

    ~ted() {
        // restore normal mode
        term.c_lflag |= ICANON;
        term.c_lflag |= ECHO;
        if (tcsetattr(0, TCSADRAIN, &term) < 0) abort();
        // get back to previour page
        std::cout << "\e[?1049l";
    }

    void clear() {
        std::cout << "\e[H\e[J";
    }

    void render_cursels() {
        for (auto cur : cursels) {
            std::cout << "\e[" << cur.l + 1 << ";" << cur.c + gap + 3 << "H";
            std::cout << "\e[48;5;17m\e[83;5;16m" << lines[cur.l][cur.c] << "\e[0m";
        }
        std::cout.flush();
    }

    void line_nb(std::string number) {
        std::cout << "\e[38;5;237m" << std::setw(gap) << number << " |\e[0m";
    }



    void move_cursels(move way) {
        for (auto &cur : cursels)
            switch(way) {
            case UP:
                if (cur.l) cur.l--;
                break;
            case DOWN:
                if (cur.l < lines.size()) cur.l++;
                break;
            case LEFT:
                if (cur.c) cur.c--;
                break;
            case RIGHT:
                if (cur.c < lines[cur.l].size()) cur.c++;
                break;
            // default:
            //     break;
            }
    }

    void render() {
        // reset cursor to (0,0)
        std::cout << "\e[H";
        // print lines
        for (size_t i=0; i < (size_t) nrows - 1; i++) {
            if (i < lines.size()) {
                line_nb(std::to_string(i));
                std::cout << lines[i] << '\n';
            } else {
                line_nb(std::string());
                std::cout << '\n';
            }
        }
        render_cursels();
    }

    void handle_input(char character) {
        switch(character) {
            case KEY_UP:
                move_cursels(UP);
                break;
            case KEY_DOWN:
                move_cursels(DOWN);
                break;
            case KEY_LEFT:
                move_cursels(LEFT);
                break;
            case KEY_RIGHT:
                move_cursels(RIGHT);
                break;
            // case KEY_BACKSPACE:
            // case 127:
            // case '\b':
            //     if (!cursor[1])
            //         return;
            //     cursor[1]--;
            //     lines[cursor[0]].erase(cursor[1], 1);
            //     break;
            // default:
                // lines[cursor[0]].insert(cursor[1], 1, (char) character);
                // cursor[1]++;
        }
        std::cout << "\e[" << nrows << ";0H" << character;
        std::cout.flush();
        render();
    }

private:
    struct termios term = {0};
    size_t gap = 3;
};
    

int main() {
    const std::string text = "#include <iostream>\n#include <ncurses.h>\n#include <unistd.h>\n\nint main() {\n    initscr();\n    noecho();\n    curs_set(FALSE);\n    mvchgat(0, 0, 1, A_REVERSE, 0, NULL);\n    mvchgat(0, 7, 1, A_REVERSE, 0, NULL);\n    refresh();\n\n    sleep(5);\n\n    endwin();\n}\n";

    ted ed(text);
    char input;
    while ((input = getch())) {
        if (input == 'x') break;
        // ed.render();
        ed.handle_input(input);
    }
    return 0;
}