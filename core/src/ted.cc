#include <vector>
#include <string>
#include <iostream>
#include <sstream>
#include <iomanip>
#include <sys/ioctl.h>
#include <unistd.h>
#include <termios.h>

#define UP 'A'
#define DOWN 'B'
#define RIGHT 'C'
#define LEFT 'D'

constexpr size_t buffer_size = 1024;
size_t gap = 3;
const std::string DELIMITER = "\n";
struct termios term = {0};

char buffer[buffer_size] = {0};
std::vector<std::string> lines;
size_t lpos = 0;
struct {
	size_t l = 0;
	size_t c = 0;
} cursor;

size_t nrows;
size_t ncols;

void close() {
    // restore normal mode
	term.c_lflag |= ICANON;
	term.c_lflag |= ECHO;
	if (tcsetattr(0, TCSADRAIN, &term) < 0) abort();
    // get back to previous page
	std::cout << "\e[?1049l";
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

	void move(char way) {
		if (way == UP || way == DOWN) {
			if (way == UP && l) --l;
			if (way == DOWN && l < lines.size() - 1) l++;
			c = std::min(lines[l].size(), hc);
			if (lpos > l) lpos = l;
			if (lpos + nrows < l) lpos = l - nrows;
		} else if (way == RIGHT || way == LEFT) {
			if (way == LEFT && c) c--;
			if (way == RIGHT && c < lines[l].size()) c++;
			hc = c;
		} else {
			close();
			std::cout << "unknown way to move " << way << std::endl;
			abort();
		}
	}

	void render(){
		char substitute = lines[l][c];
		if (!substitute) substitute = ' ';
		std::cout << "\e[" << l + 1 << ";" << c + gap + 3 << "H";
		std::cout << "\e[48;5;214m\e[38;5;16m" << substitute << "\e[0m";
	}

	void input(int length) {
		lines[l].insert(c, buffer, length);
		c += length;
	}

	void backspace() {
		if (c > 0) {
			lines[l].erase(--c, 1);
		} else if (l > 0) {
			c = lines[l].size();
			lines[l - 1] += lines[l];
			lines.erase(lines.begin() + l);
			move(UP);
		}
	}

	void newline() {
		lines.insert(lines.begin() + l + 1, lines[l].substr(c));
		lines[l] = lines[l].substr(0, c);
		c = 0;
		move(DOWN);
	}

};

cursel cur(0, 0);


void line_nb(std::string number) {
	std::cout << "\e[38;5;237m" << std::setw(gap) << number << " |\e[0m";
}

void clear() {
	std::cout << "\e[H\e[J";
}

void render() {
    // reset cursor to (0,0) \e[J
	std::cout << "\e[H";
    // print lines
	for (size_t i=0; i < (size_t) nrows - 1; i++) {
		if (i < lines.size()) {
			line_nb(std::to_string(lpos + i + 1));
			std::cout << lines[lpos + i] << "  \e[0K\n";
		} else {
			line_nb("");
			std::cout << "\e[0K\n";
		}
	}
	cur.render();
	std::cout.flush();
}

void init(std::string text) {
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
    // convert input to lines
	size_t last = 0, next = 0; 
	while ((next = text.find(DELIMITER, last)) != std::string::npos) {
		lines.emplace_back(text.substr(last, next-last));
		last = next + 1;
	}
    // populate screen
	render();
}

int getch() {
	return read(0, &buffer, buffer_size);
}

void handle_input(int read_size) {
	if (buffer[0] == '\e') {
		if (read_size == 3 && buffer[1] == '[') {
			cur.move(buffer[2]);
		}
	} else if (buffer[0] == 127) {
		cur.backspace();
	} else if (buffer[0] == '\n') {
		cur.newline();
	} else {
		cur.input(read_size);
	}
	std::cout << "\e[" << nrows << ";0H\e[0K";
	for (int i=0; i < read_size; i++)
		switch(buffer[i]) {
			case '\e':
			std::cout << "ESC";
			break;
			case '\b':
			std::cout << "DEL";
			break;
			case '\n':
			std::cout << "CR";
			break;
			default:
			std::cout << +buffer[i];
		}
	std::cout.flush();
	render();
}


int main() {
	const std::string text = "#include <iostream>\n#include <ncurses.h>\n#include <unistd.h>\n\nint main() {\n    initscr();\n    noecho();\n    curs_set(FALSE);\n    mvchgat(0, 0, 1, A_REVERSE, 0, NULL);\n    mvchgat(0, 7, 1, A_REVERSE, 0, NULL);\n    refresh();\n\n    sleep(5);\n\n    endwin();\n}\n";

	init(text);
	while (true) {
		int length = getch();
		if (buffer[0] == 'x') break;
		handle_input(length);
	}

	close();
	return 0;
}