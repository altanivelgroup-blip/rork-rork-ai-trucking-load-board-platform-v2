import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Image, ScrollView } from 'react-native';
import Head from 'expo-router/head';
import { useLocalSearchParams, Stack } from 'expo-router';
import { theme } from '@/constants/theme';
import { BLOG_POSTS, type BlogPost } from '@/mocks/blogPosts';

export default function BlogPostScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();

  const post: BlogPost | undefined = useMemo(
    () => BLOG_POSTS.find((p) => p.slug === slug),
    [slug]
  );

  if (!post) {
    return (
      <View style={styles.notFound} testID="blog-not-found">
        <Text style={styles.notFoundTitle}>Post not found</Text>
        <Text style={styles.notFoundSubtitle}>The article you are looking for does not exist.</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: post.title }} />
      <Head>
        <title dangerouslySetInnerHTML={{ __html: post.title }} />
        <meta name="description" content={post.excerpt} />
      </Head>
      <ScrollView style={styles.container} contentContainerStyle={styles.content} testID="blog-post">
        <Image source={{ uri: post.heroImage }} style={styles.hero} resizeMode="cover" />
        <Text style={styles.title} testID="post-title">{post.title}</Text>
        <Text style={styles.excerpt} testID="post-excerpt">{post.excerpt}</Text>
        <View style={styles.bodyBlock}>
          <Text style={styles.h2}>Key Takeaways</Text>
          <Text style={styles.p}>
            • Use filters to target profitable lanes, set minimum rate alerts, and save searches.
          </Text>
          <Text style={styles.p}>
            • Verify vehicle details, pickup windows, and accessorials before you book.
          </Text>
          <Text style={styles.p}>
            • Build shipper relationships by communicating ETAs and sharing PODs quickly.
          </Text>
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.lightGray,
  },
  content: {
    paddingBottom: theme.spacing.xl,
  },
  hero: {
    width: '100%',
    height: 220,
  },
  title: {
    fontSize: theme.fontSize.xl,
    fontWeight: '800',
    color: theme.colors.dark,
    paddingHorizontal: theme.spacing.md,
    marginTop: theme.spacing.md,
  },
  excerpt: {
    fontSize: theme.fontSize.md,
    color: theme.colors.gray,
    paddingHorizontal: theme.spacing.md,
    marginTop: theme.spacing.xs,
  },
  bodyBlock: {
    backgroundColor: theme.colors.card,
    margin: theme.spacing.md,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  h2: {
    fontSize: theme.fontSize.lg,
    fontWeight: '700',
    color: theme.colors.dark,
    marginBottom: theme.spacing.sm,
  },
  p: {
    fontSize: theme.fontSize.md,
    color: theme.colors.dark,
    marginBottom: theme.spacing.xs,
  },
  notFound: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.lightGray,
    padding: theme.spacing.lg,
  },
  notFoundTitle: {
    fontSize: theme.fontSize.xl,
    color: theme.colors.dark,
    fontWeight: '800',
  },
  notFoundSubtitle: {
    fontSize: theme.fontSize.md,
    color: theme.colors.gray,
    marginTop: theme.spacing.xs,
  },
});
