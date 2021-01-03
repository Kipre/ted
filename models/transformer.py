class SelfAttention(tf.keras.layers.Layer):

    def __init__(self, batch_size, window_size, vector_size, heads=8):
        super(SelfAttention, self).__init__()
        self.b = batch_size
        self.w = window_size
        self.v = vector_size
        self.h = heads
        self.query = tf.keras.layers.Dense(self.v*self.h, use_bias=False)
        self.value = tf.keras.layers.Dense(self.v*self.h, use_bias=False)
        self.key = tf.keras.layers.Dense(self.v*self.h, use_bias=False)
        self.reduce = tf.keras.layers.Dense(self.v, use_bias=False)

    def __call__(self, x):
        q = tf.reshape(self.query(x), [self.b, self.w, self.h, self.v])
        v = tf.reshape(self.value(x), [self.b, self.w, self.h, self.v])
        k = tf.reshape(self.key(x), [self.b, self.w, self.h, self.v])
        w = (tf.transpose(q, perm=[0, 2, 1, 3]) @ tf.transpose(k, perm=[0, 2, 3, 1])) / tf.sqrt(np.array(self.v, dtype=np.float32))
        w = tf.nn.softmax(w, axis=-1)
        res = w @ tf.transpose(v, perm=[0, 2, 1, 3])
        return self.reduce(tf.reshape(tf.transpose(res, perm=[0, 2, 1, 3]), [self.b, self.w, self.v*self.h]))


class TransformerBlock(tf.keras.layers.Layer):

    def __init__(self, batch_size, window_size, vector_size, heads=8):
        super(TransformerBlock, self).__init__()
        self.b = batch_size
        self.w = window_size
        self.v = vector_size
        self.h = heads

        self.attention = SelfAttention(batch_size, window_size, vector_size, heads)

        self.n1 = tf.keras.layers.LayerNormalization()
        self.n2 = tf.keras.layers.LayerNormalization()

        self.ff = tf.keras.Sequential([tf.keras.layers.Dense(4*self.v, 'relu'),
                                       tf.keras.layers.Dense(self.v)])
        
    def __call__(self, x):
        att = self.attention(x)
        x = self.n1(att + x)
        ff = self.ff(x)
        return self.n2(ff + x)

        

class Transformer(tf.keras.Model):
    
    def __init__(self, batch_size, nb_tokens, window_size, vector_size, heads, depth, num_classes):
        super(Transformer, self).__init__()
        self.w = window_size

        self.token_emb = tf.keras.layers.Embedding(nb_tokens, vector_size, input_length=window_size)
        self.pos_emb = tf.keras.layers.Embedding(window_size, vector_size, input_length=window_size)

        blocks = [TransformerBlock(batch_size, window_size, vector_size, heads) for d in range(depth)]

        self.blocks = tf.keras.Sequential(blocks)

        self.final = tf.keras.layers.Dense(num_classes, 'softmax')

    def __call__(self, x):
        tokens = self.token_emb(x)
        pos = self.pos_emb(tf.range(self.w))[tf.newaxis, :, :]
        x = tokens + pos
        x = self.blocks(x)
        x = tf.reduce_mean(x, axis=-2)
        return self.final(x)


initializer = tf.random_normal_initializer()
embedding_size = 5
window_size = 11
batch_size = 8
nb_tokens = 13
heads = 7
depth = 9
num_classes = 2


model = Transformer(batch_size, nb_tokens, window_size, embedding_size, heads, depth, num_classes)
model(np.random.randint(0, nb_tokens, size=(batch_size, window_size)))
